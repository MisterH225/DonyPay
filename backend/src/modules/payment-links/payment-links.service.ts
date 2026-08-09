import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  InstallmentStatus,
  PaymentLinkStatus,
  SavingsMode,
  type PaymentLink,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MobileMoneyAdapter } from '../ledger-adapter';
import { NotificationsService } from '../notifications';
import { SavingsGoalsService } from '../savings-engine/savings-goals.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

export type PublicPaymentPage = {
  token: string;
  status: PaymentLinkStatus;
  amount: string;
  currency: string;
  expiresAt: Date;
  productName: string;
  shopName: string;
  installmentSequence: number;
  dueDate: Date;
  requiresAccount: false;
  ussdHint?: string | null;
  collectionStatus?: string | null;
};

export type MarkPaidFromCollectionInput = {
  paymentLinkId: string;
  providerRef: string;
  payerName: string;
  payerPhone: string;
  payerOperator: string;
};

@Injectable()
export class PaymentLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly savingsGoals: SavingsGoalsService,
    private readonly notifications: NotificationsService,
    private readonly mobileMoney: MobileMoneyAdapter,
  ) {}

  getHello(): { module: string; message: string } {
    return {
      module: 'payment-links',
      message: 'Hello from payment-links module',
    };
  }

  async create(dto: CreatePaymentLinkDto) {
    const installment = await this.prisma.savingsInstallment.findUnique({
      where: { id: dto.installmentId },
      include: {
        goal: {
          include: {
            product: { include: { shop: true } },
            user: true,
          },
        },
      },
    });

    if (!installment) {
      throw new NotFoundException(`Installment ${dto.installmentId} not found`);
    }

    if (installment.goal.mode !== SavingsMode.schedule) {
      throw new BadRequestException(
        'Payment links are only available for schedule installments',
      );
    }

    if (
      installment.status === InstallmentStatus.paid ||
      installment.status === InstallmentStatus.cancelled
    ) {
      throw new BadRequestException(
        `Cannot create payment link for installment with status ${installment.status}`,
      );
    }

    const phone = dto.phone?.trim() || installment.goal.user.phone?.trim();
    if (!phone) {
      throw new BadRequestException(
        'A Mobile Money phone is required to initiate collection (dto.phone or goal owner phone)',
      );
    }

    const ttlHours = this.resolveTtlHours();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const token = randomBytes(24).toString('base64url');
    const amount = Number(installment.amount.toString());

    const link = await this.prisma.paymentLink.create({
      data: {
        token,
        installmentId: installment.id,
        amount: installment.amount,
        expiresAt,
      },
    });

    const collection = await this.mobileMoney.initiateCollection({
      accountId: installment.goal.ledgerAccountId,
      amount,
      phone,
      operator: dto.operator,
      description: `Lien paiement · ${installment.goal.product.name} · échéance #${installment.sequence}`,
      metadata: {
        paymentLinkId: link.id,
        installmentId: installment.id,
        goalId: installment.goalId,
        payerName: dto.payerName ?? null,
      },
    });

    const updated = await this.prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        mobileMoneyCollectionId: collection.collectionId,
        providerRef: collection.providerRef,
      },
    });

    return {
      ...updated,
      amount: updated.amount.toString(),
      publicUrl: this.buildPublicUrl(updated.token),
      ttlHours,
      collection: {
        id: collection.collectionId,
        providerRef: collection.providerRef,
        status: collection.status,
        ussdHint: collection.ussdHint,
        paymentUrl: collection.paymentUrl,
        sandbox: collection.sandbox,
      },
    };
  }

  /**
   * Appelé uniquement depuis le webhook Mobile Money (HMAC + re-check API)
   * après un `recordDeposit` ledger réussi.
   */
  async markPaidFromCollection(input: MarkPaidFromCollectionInput) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { id: input.paymentLinkId },
      include: {
        installment: {
          include: {
            goal: {
              include: {
                product: { include: { shop: true } },
                user: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(
        `Payment link ${input.paymentLinkId} not found`,
      );
    }

    if (link.status === PaymentLinkStatus.paid) {
      return {
        token: link.token,
        status: link.status,
        amount: link.amount.toString(),
        installmentId: link.installmentId,
        message: 'Payment link already marked paid',
      };
    }

    await this.refreshExpired(link);

    if (link.status === PaymentLinkStatus.expired) {
      throw new GoneException('Payment link has expired');
    }

    if (link.status !== PaymentLinkStatus.pending) {
      throw new BadRequestException(
        `Payment link cannot be paid in status ${link.status}`,
      );
    }

    const amount = Number(link.amount.toString());

    // Effets métier objectif/échéance — ledger déjà crédité par MobileMoneyAdapter.
    if (link.installment.status !== InstallmentStatus.paid) {
      await this.savingsGoals.applyDepositAlreadyOnLedger(
        link.installment.goalId,
        {
          amount,
          installmentId: link.installmentId,
        },
      );
    }

    const [updatedLink, updatedInstallment] = await this.prisma.$transaction([
      this.prisma.paymentLink.update({
        where: { id: link.id },
        data: {
          status: PaymentLinkStatus.paid,
          usedAt: new Date(),
          payerName: input.payerName,
          payerPhone: input.payerPhone,
          payerOperator: input.payerOperator,
          providerRef: input.providerRef,
        },
      }),
      this.prisma.savingsInstallment.update({
        where: { id: link.installmentId },
        data: {
          payerName: input.payerName,
          payerPhone: input.payerPhone,
          payerOperator: input.payerOperator,
        },
      }),
      this.prisma.paymentLink.updateMany({
        where: {
          installmentId: link.installmentId,
          status: PaymentLinkStatus.pending,
          id: { not: link.id },
        },
        data: { status: PaymentLinkStatus.cancelled },
      }),
    ]);

    const owner = link.installment.goal.user;
    const isThirdParty =
      !owner.phone ||
      this.normalizePhone(input.payerPhone) !==
        this.normalizePhone(owner.phone);

    if (isThirdParty) {
      await this.notifications.notifyPaymentLinkPaidByThirdParty({
        userId: owner.id,
        phone: owner.phone,
        title: 'Lien de paiement réglé par un tiers',
        body: `${input.payerName} (${input.payerOperator}) a payé ${updatedLink.amount.toString()} pour « ${link.installment.goal.product.name} ».`,
        metadata: {
          goalId: link.installment.goalId,
          installmentId: link.installmentId,
          paymentLinkId: updatedLink.id,
          payerName: input.payerName,
          payerPhone: input.payerPhone,
          payerOperator: input.payerOperator,
          providerRef: input.providerRef,
        },
      });
    }

    return {
      token: updatedLink.token,
      status: updatedLink.status,
      amount: updatedLink.amount.toString(),
      installmentId: updatedInstallment.id,
      payer: {
        name: updatedInstallment.payerName,
        phone: updatedInstallment.payerPhone,
        operator: updatedInstallment.payerOperator,
      },
      providerRef: updatedLink.providerRef,
      message: 'Payment confirmed via Mobile Money webhook',
    };
  }

  async getPublicPage(token: string): Promise<PublicPaymentPage> {
    const link = await this.findByToken(token);
    await this.refreshExpired(link);

    if (link.status === PaymentLinkStatus.expired) {
      throw new GoneException('Payment link has expired');
    }

    let ussdHint: string | null | undefined;
    let collectionStatus: string | null | undefined;
    if (link.mobileMoneyCollectionId) {
      const collection = await this.prisma.mobileMoneyCollection.findUnique({
        where: { id: link.mobileMoneyCollectionId },
      });
      ussdHint = collection?.ussdHint;
      collectionStatus = collection?.status;
    }

    return {
      token: link.token,
      status: link.status,
      amount: link.amount.toString(),
      currency: 'XOF',
      expiresAt: link.expiresAt,
      productName: link.installment.goal.product.name,
      shopName: link.installment.goal.product.shop.name,
      installmentSequence: link.installment.sequence,
      dueDate: link.installment.dueDate,
      requiresAccount: false,
      ussdHint,
      collectionStatus,
    };
  }

  renderPublicHtml(page: PublicPaymentPage): string {
    const statusLabel =
      page.status === PaymentLinkStatus.paid
        ? 'Déjà payé'
        : page.status === PaymentLinkStatus.pending
          ? 'En attente de paiement'
          : page.status;

    const ussdBlock = page.ussdHint
      ? `<p class="muted">USSD : ${this.escapeHtml(page.ussdHint)}</p>`
      : '';

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Paiement DonyPay</title>
  <style>
    body { font-family: Georgia, serif; margin: 0; background: #f4f7f5; color: #1d2a24; }
    main { max-width: 420px; margin: 10vh auto; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.06); }
    h1 { font-size: 1.4rem; margin: 0 0 .5rem; }
    p { margin: .35rem 0; line-height: 1.4; }
    .amount { font-size: 2rem; font-weight: 700; margin: 1rem 0; }
    .muted { color: #5c6b63; font-size: .95rem; }
  </style>
</head>
<body>
  <main>
    <p class="muted">Paiement sans compte</p>
    <h1>${this.escapeHtml(page.productName)}</h1>
    <p class="muted">${this.escapeHtml(page.shopName)} · Échéance #${page.installmentSequence}</p>
    <p class="amount">${this.escapeHtml(page.amount)} ${page.currency}</p>
    <p>Statut : <strong>${statusLabel}</strong></p>
    ${ussdBlock}
    <p class="muted">Expire le ${page.expiresAt.toISOString()}</p>
  </main>
</body>
</html>`;
  }

  private async findByToken(token: string) {
    const link = await this.prisma.paymentLink.findUnique({
      where: { token },
      include: {
        installment: {
          include: {
            goal: {
              include: {
                product: { include: { shop: true } },
                user: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Payment link not found');
    }

    return link;
  }

  private async refreshExpired(link: PaymentLink): Promise<void> {
    if (
      link.status !== PaymentLinkStatus.pending ||
      link.expiresAt.getTime() > Date.now()
    ) {
      return;
    }

    await this.prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: PaymentLinkStatus.expired },
    });
    link.status = PaymentLinkStatus.expired;
  }

  private resolveTtlHours(): number {
    const raw = process.env.PAYMENT_LINK_TTL_HOURS;
    const parsed = raw ? Number(raw) : 48;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 48;
    }
    return parsed;
  }

  private buildPublicUrl(token: string): string {
    const base =
      process.env.PAYMENT_LINK_PUBLIC_BASE_URL ??
      'http://localhost:3000/api/payment-links/public';
    return `${base.replace(/\/$/, '')}/${token}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').replace(/^\+/, '');
  }
}
