import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import {
  MobileMoneyCollectionStatus,
  Prisma,
  type MobileMoneyCollection,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PAYMENT_LINKS_SERVICE } from '../../payment-links/payment-links.tokens';
import type { PaymentLinksService } from '../../payment-links/payment-links.service';
import {
  signCinetPayNotify,
  verifyCinetPayHmac,
} from '../mobile-money/cinetpay-hmac';
import { CINETPAY_CLIENT } from '../mobile-money/cinetpay.tokens';
import type {
  CinetPayClient,
  CinetPayWebhookBody,
} from '../mobile-money/cinetpay.types';
import { SandboxCinetPayClient } from '../mobile-money/sandbox-cinetpay.client';
import { LedgerMetadata, LedgerPort } from '../ports/ledger.port';
import { MockLedgerAdapter } from './mock-ledger.adapter';

export type InitiateCollectionInput = {
  accountId: string;
  amount: number;
  phone: string;
  operator?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type InitiateCollectionResult = {
  collectionId: string;
  providerRef: string;
  status: MobileMoneyCollectionStatus;
  ussdHint?: string | null;
  paymentUrl?: string;
  sandbox: boolean;
};

/**
 * Deuxième implémentation de LedgerPort — côté collecte Mobile Money (CinetPay).
 *
 * - Méthodes LedgerPort (compta append-only) : déléguées à MockLedgerAdapter.
 * - Collecte async : initiateCollection → push USSD (sandbox) → webhook HMAC
 *   → recordDeposit uniquement après validation de signature.
 *
 * Ne jamais faire confiance au payload webhook sans HMAC valide.
 */
@Injectable()
export class MobileMoneyAdapter implements LedgerPort {
  private readonly logger = new Logger(MobileMoneyAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: MockLedgerAdapter,
    @Inject(CINETPAY_CLIENT) private readonly cinetPay: CinetPayClient,
    private readonly config: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ---------------------------------------------------------------------------
  // LedgerPort — délégation comptable
  // ---------------------------------------------------------------------------

  openSavingsAccount(userId: string): Promise<string> {
    return this.accounting.openSavingsAccount(userId);
  }

  recordDeposit(
    accountId: string,
    amount: number,
    metadata?: LedgerMetadata,
  ): Promise<void> {
    return this.accounting.recordDeposit(accountId, amount, metadata);
  }

  getBalance(accountId: string): Promise<number> {
    return this.accounting.getBalance(accountId);
  }

  recordWithdrawal(accountId: string, amount: number): Promise<void> {
    return this.accounting.recordWithdrawal(accountId, amount);
  }

  // ---------------------------------------------------------------------------
  // Collecte async CinetPay
  // ---------------------------------------------------------------------------

  isSandbox(): boolean {
    return this.config.get<string>('CINETPAY_SANDBOX', 'true') !== 'false';
  }

  getSecretKey(): string {
    const key = this.config.get<string>('CINETPAY_SECRET_KEY');
    if (!key?.trim()) {
      if (this.isSandbox()) {
        return 'cinetpay_sandbox_secret';
      }
      throw new ServiceUnavailableException(
        'CINETPAY_SECRET_KEY is required outside sandbox',
      );
    }
    return key;
  }

  getSiteId(): string {
    return this.config.get<string>('CINETPAY_SITE_ID', 'sandbox_site');
  }

  getNotifyBaseUrl(): string {
    return (
      this.config.get<string>('CINETPAY_NOTIFY_BASE_URL') ??
      `http://localhost:${this.config.get('PORT', 3000)}/api/ledger-adapter/mobile-money`
    );
  }

  async initiateCollection(
    input: InitiateCollectionInput,
  ): Promise<InitiateCollectionResult> {
    if (!Number.isFinite(input.amount) || input.amount < 1) {
      throw new BadRequestException('amount must be >= 1');
    }

    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: input.accountId },
    });
    if (!account) {
      throw new NotFoundException(
        `Ledger account ${input.accountId} not found`,
      );
    }

    const providerRef = `dp_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const notifyUrl = `${this.getNotifyBaseUrl()}/webhook`;
    const description =
      input.description ?? `DonyPay collecte ${input.amount} XOF`;

    const collection = await this.prisma.mobileMoneyCollection.create({
      data: {
        providerRef,
        accountId: input.accountId,
        amount: new Prisma.Decimal(input.amount).toDecimalPlaces(2),
        currency: 'XOF',
        phone: input.phone,
        operator: input.operator,
        description,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        status: MobileMoneyCollectionStatus.pending,
      },
    });

    const initiation = await this.cinetPay.initiatePayment({
      transactionId: providerRef,
      amount: Number(collection.amount.toString()),
      currency: 'XOF',
      description,
      notifyUrl,
      phone: input.phone,
      channels: 'MOBILE_MONEY',
      custom: JSON.stringify({
        collectionId: collection.id,
        accountId: input.accountId,
        ...(input.metadata ?? {}),
      }),
    });

    const updated = await this.prisma.mobileMoneyCollection.update({
      where: { id: collection.id },
      data: {
        status: MobileMoneyCollectionStatus.ussd_sent,
        ussdHint: initiation.ussdHint,
      },
    });

    this.logger.log(
      `Collecte initiée id=${updated.id} ref=${providerRef} status=ussd_sent sandbox=${this.isSandbox()}`,
    );

    return {
      collectionId: updated.id,
      providerRef: updated.providerRef,
      status: updated.status,
      ussdHint: updated.ussdHint,
      paymentUrl: initiation.paymentUrl,
      sandbox: this.isSandbox(),
    };
  }

  /**
   * Webhook CinetPay — refuse tout traitement si HMAC `x-token` invalide.
   */
  async handleWebhook(
    body: CinetPayWebhookBody,
    xToken: string | undefined,
  ): Promise<{
    providerRef: string;
    status: MobileMoneyCollectionStatus;
    ledgerCredited: boolean;
  }> {
    const secret = this.getSecretKey();

    if (!verifyCinetPayHmac(body, xToken, secret)) {
      this.logger.warn(
        `Webhook rejeté — HMAC invalide ou absent (trans=${body?.cpm_trans_id ?? 'n/a'})`,
      );
      throw new UnauthorizedException(
        'Invalid or missing CinetPay HMAC x-token — payload rejected',
      );
    }

    const providerRef = body.cpm_trans_id;
    if (!providerRef) {
      throw new BadRequestException('cpm_trans_id is required');
    }

    const collection = await this.prisma.mobileMoneyCollection.findUnique({
      where: { providerRef },
    });
    if (!collection) {
      throw new NotFoundException(
        `Mobile money collection ${providerRef} not found`,
      );
    }

    if (collection.status === MobileMoneyCollectionStatus.confirmed) {
      return {
        providerRef,
        status: collection.status,
        ledgerCredited: false,
      };
    }

    if (collection.status === MobileMoneyCollectionStatus.failed) {
      throw new ConflictException('Collection already marked as failed');
    }

    // Ne jamais faire confiance au seul message webhook : confirmer via check API.
    if (this.cinetPay instanceof SandboxCinetPayClient) {
      const success = this.isSuccessMessage(body.cpm_error_message);
      this.cinetPay.setSandboxStatus(
        providerRef,
        success ? 'ACCEPTED' : 'REFUSED',
      );
    }

    const check = await this.cinetPay.checkTransaction(providerRef);
    if (check.status === 'PENDING') {
      return {
        providerRef,
        status: collection.status,
        ledgerCredited: false,
      };
    }

    if (check.status !== 'ACCEPTED') {
      await this.prisma.mobileMoneyCollection.update({
        where: { id: collection.id },
        data: {
          status: MobileMoneyCollectionStatus.failed,
          failureReason: body.cpm_error_message || check.status,
        },
      });
      return {
        providerRef,
        status: MobileMoneyCollectionStatus.failed,
        ledgerCredited: false,
      };
    }

    const amount = Number(collection.amount.toString());
    const webhookAmount = Number(body.cpm_amount);
    if (Number.isFinite(webhookAmount) && webhookAmount !== amount) {
      throw new BadRequestException(
        `Amount mismatch: collection=${amount} webhook=${webhookAmount}`,
      );
    }

    await this.recordDeposit(collection.accountId, amount, {
      source: 'mobile_money',
      provider: 'cinetpay',
      providerRef,
      collectionId: collection.id,
      phone: body.cel_phone_num || collection.phone,
      operator: collection.operator,
      paymentMethod: body.payment_method,
    });

    await this.prisma.mobileMoneyCollection.update({
      where: { id: collection.id },
      data: {
        status: MobileMoneyCollectionStatus.confirmed,
        confirmedAt: new Date(),
        failureReason: null,
      },
    });

    await this.completePaymentLinkIfPresent(collection, body, providerRef);

    this.logger.log(
      `Collecte confirmée ref=${providerRef} — dépôt ledger account=${collection.accountId} amount=${amount}`,
    );

    return {
      providerRef,
      status: MobileMoneyCollectionStatus.confirmed,
      ledgerCredited: true,
    };
  }

  /**
   * Si la collecte est liée à un PaymentLink (metadata.paymentLinkId),
   * marque le lien paid et invalide les autres pending de l’échéance.
   */
  private async completePaymentLinkIfPresent(
    collection: MobileMoneyCollection,
    body: CinetPayWebhookBody,
    providerRef: string,
  ): Promise<void> {
    const metadata = this.asMetadataRecord(collection.metadata);
    const paymentLinkId = metadata?.paymentLinkId;
    if (typeof paymentLinkId !== 'string' || !paymentLinkId) {
      return;
    }

    const payerPhone = this.resolvePayerPhone(body, collection.phone);
    const payerOperator =
      body.payment_method?.trim() ||
      collection.operator?.trim() ||
      'MOBILE_MONEY';
    const payerName =
      (typeof metadata.payerName === 'string' && metadata.payerName.trim()) ||
      `Payeur ${payerOperator}`;

    // Résolution lazy via token — évite le cycle Nest LedgerAdapter ↔ PaymentLinks.
    const paymentLinks = this.moduleRef.get<PaymentLinksService>(
      PAYMENT_LINKS_SERVICE,
      { strict: false },
    );

    await paymentLinks.markPaidFromCollection({
      paymentLinkId,
      providerRef,
      payerName,
      payerPhone,
      payerOperator,
    });
  }

  private asMetadataRecord(
    metadata: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    return metadata as Record<string, unknown>;
  }

  private resolvePayerPhone(
    body: CinetPayWebhookBody,
    fallback: string,
  ): string {
    const raw = body.cel_phone_num?.trim();
    if (!raw) return fallback;
    if (raw.startsWith('+')) return raw;
    const prefix = body.cpm_phone_prefixe?.replace(/^\+/, '').trim();
    if (prefix) return `+${prefix}${raw.replace(/^\+/, '')}`;
    return raw;
  }

  /**
   * Sandbox uniquement : fabrique un webhook signé (HMAC) et le traite.
   * Utile pour enchaîner initiation → USSD → confirmation sans CinetPay réel.
   */
  async simulateSandboxCallback(
    providerRef: string,
    success = true,
  ): Promise<{
    providerRef: string;
    status: MobileMoneyCollectionStatus;
    ledgerCredited: boolean;
  }> {
    if (!this.isSandbox()) {
      throw new ServiceUnavailableException(
        'Sandbox simulate is only available when CINETPAY_SANDBOX=true',
      );
    }

    const collection = await this.requireCollection(providerRef);
    const body = this.buildSandboxNotifyBody(collection, success);
    const token = signCinetPayNotify(body, this.getSecretKey());
    return this.handleWebhook(body, token);
  }

  async getCollection(providerRef: string): Promise<MobileMoneyCollection> {
    return this.requireCollection(providerRef);
  }

  private async requireCollection(
    providerRef: string,
  ): Promise<MobileMoneyCollection> {
    const collection = await this.prisma.mobileMoneyCollection.findUnique({
      where: { providerRef },
    });
    if (!collection) {
      throw new NotFoundException(
        `Mobile money collection ${providerRef} not found`,
      );
    }
    return collection;
  }

  private buildSandboxNotifyBody(
    collection: MobileMoneyCollection,
    success: boolean,
  ): CinetPayWebhookBody {
    return {
      cpm_site_id: this.getSiteId(),
      cpm_trans_id: collection.providerRef,
      cpm_trans_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
      cpm_amount: collection.amount.toFixed(0),
      cpm_currency: collection.currency,
      signature: 'sandbox_signature',
      payment_method: collection.operator ?? 'OM',
      cel_phone_num: collection.phone.replace(/^\+/, ''),
      cpm_phone_prefixe: '225',
      cpm_language: 'fr',
      cpm_version: 'V4',
      cpm_payment_config: 'SINGLE',
      cpm_page_action: 'PAYMENT',
      cpm_custom: JSON.stringify({ collectionId: collection.id }),
      cpm_designation: collection.description ?? 'DonyPay',
      cpm_error_message: success ? 'SUCCES' : 'FAILED',
    };
  }

  private isSuccessMessage(message: string | undefined): boolean {
    if (!message) return false;
    const normalized = message.trim().toUpperCase();
    return normalized === 'SUCCES' || normalized === 'SUCCESS';
  }
}
