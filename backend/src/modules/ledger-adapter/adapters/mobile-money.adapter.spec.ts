import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerAccountKind, MobileMoneyCollectionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { signCinetPayNotify } from '../mobile-money/cinetpay-hmac';
import { SandboxCinetPayClient } from '../mobile-money/sandbox-cinetpay.client';
import { createInMemoryPrismaFake } from '../testing/in-memory-prisma.fake';
import { MockLedgerAdapter } from './mock-ledger.adapter';
import { MobileMoneyAdapter } from './mobile-money.adapter';

describe('MobileMoneyAdapter', () => {
  let prisma: ReturnType<typeof createInMemoryPrismaFake>;
  let accounting: MockLedgerAdapter;
  let cinetPay: SandboxCinetPayClient;
  let adapter: MobileMoneyAdapter;

  beforeEach(() => {
    prisma = createInMemoryPrismaFake();
    accounting = new MockLedgerAdapter(prisma);
    cinetPay = new SandboxCinetPayClient();
    const config = {
      get: (key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          CINETPAY_SANDBOX: 'true',
          CINETPAY_SECRET_KEY: 'cinetpay_sandbox_secret',
          CINETPAY_SITE_ID: 'sandbox_site',
          CINETPAY_NOTIFY_BASE_URL:
            'http://localhost:3000/api/ledger-adapter/mobile-money',
          PORT: '3000',
        };
        return map[key] ?? defaultValue;
      },
    } as unknown as ConfigService;

    adapter = new MobileMoneyAdapter(prisma, accounting, cinetPay, config);
  });

  it('implémente LedgerPort (délégation comptable)', async () => {
    const accountId = await adapter.openSavingsAccount('user-1');
    await adapter.recordDeposit(accountId, 500, { source: 'test' });
    expect(await adapter.getBalance(accountId)).toBe(500);
  });

  it('initiation → USSD sandbox → webhook HMAC → crédit ledger', async () => {
    const accountId = await adapter.openSavingsAccount('user-mm');

    const initiated = await adapter.initiateCollection({
      accountId,
      amount: 1500,
      phone: '+2250700112233',
      operator: 'OM',
      description: 'Versement échéance',
    });

    expect(initiated.status).toBe(MobileMoneyCollectionStatus.ussd_sent);
    expect(initiated.sandbox).toBe(true);
    expect(initiated.ussdHint).toContain('sandbox USSD');
    expect(await adapter.getBalance(accountId)).toBe(0);

    const result = await adapter.simulateSandboxCallback(
      initiated.providerRef,
      true,
    );

    expect(result.ledgerCredited).toBe(true);
    expect(result.status).toBe(MobileMoneyCollectionStatus.confirmed);
    expect(await adapter.getBalance(accountId)).toBe(1500);

    const collection = await adapter.getCollection(initiated.providerRef);
    expect(collection.status).toBe(MobileMoneyCollectionStatus.confirmed);
  });

  it('rejette un webhook sans HMAC valide — aucun crédit', async () => {
    const accountId = await adapter.openSavingsAccount('user-2');
    const initiated = await adapter.initiateCollection({
      accountId,
      amount: 1000,
      phone: '0700000000',
    });

    await expect(
      adapter.handleWebhook(
        {
          cpm_site_id: 'sandbox_site',
          cpm_trans_id: initiated.providerRef,
          cpm_trans_date: '2026-08-03 12:00:00',
          cpm_amount: '1000',
          cpm_currency: 'XOF',
          signature: 'sig',
          payment_method: 'OM',
          cel_phone_num: '0700000000',
          cpm_phone_prefixe: '225',
          cpm_language: 'fr',
          cpm_version: 'V4',
          cpm_payment_config: 'SINGLE',
          cpm_page_action: 'PAYMENT',
          cpm_custom: '{}',
          cpm_designation: 'x',
          cpm_error_message: 'SUCCES',
        },
        'forged-token',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(await adapter.getBalance(accountId)).toBe(0);
  });

  it('accepte un webhook avec HMAC correct', async () => {
    const accountId = await adapter.openSavingsAccount('user-3');
    expect(
      (await prisma.ledgerAccount.findUnique({ where: { id: accountId } }))
        ?.kind,
    ).toBe(LedgerAccountKind.savings);

    const initiated = await adapter.initiateCollection({
      accountId,
      amount: 2000,
      phone: '0700000001',
    });

    const collection = await adapter.getCollection(initiated.providerRef);
    const body = {
      cpm_site_id: 'sandbox_site',
      cpm_trans_id: initiated.providerRef,
      cpm_trans_date: '2026-08-03 12:00:00',
      cpm_amount: collection.amount.toFixed(0),
      cpm_currency: 'XOF',
      signature: 'sandbox_signature',
      payment_method: 'MOMO',
      cel_phone_num: '0700000001',
      cpm_phone_prefixe: '225',
      cpm_language: 'fr',
      cpm_version: 'V4',
      cpm_payment_config: 'SINGLE',
      cpm_page_action: 'PAYMENT',
      cpm_custom: JSON.stringify({ collectionId: collection.id }),
      cpm_designation: collection.description ?? 'DonyPay',
      cpm_error_message: 'SUCCES',
    };
    const token = signCinetPayNotify(body, 'cinetpay_sandbox_secret');

    const result = await adapter.handleWebhook(body, token);
    expect(result.ledgerCredited).toBe(true);
    expect(await adapter.getBalance(accountId)).toBe(2000);
  });

  it('idempotent si déjà confirmé', async () => {
    const accountId = await adapter.openSavingsAccount('user-4');
    const initiated = await adapter.initiateCollection({
      accountId,
      amount: 800,
      phone: '0700000002',
    });

    await adapter.simulateSandboxCallback(initiated.providerRef, true);
    const second = await adapter.simulateSandboxCallback(
      initiated.providerRef,
      true,
    );

    expect(second.ledgerCredited).toBe(false);
    expect(await adapter.getBalance(accountId)).toBe(800);
  });
});
