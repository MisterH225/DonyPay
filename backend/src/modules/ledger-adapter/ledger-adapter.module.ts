import { Module } from '@nestjs/common';
import { MockLedgerAdapter } from './adapters/mock-ledger.adapter';
import { MobileMoneyAdapter } from './adapters/mobile-money.adapter';
import { LedgerAdapterController } from './ledger-adapter.controller';
import { LedgerAdapterService } from './ledger-adapter.service';
import { MobileMoneyWebhookController } from './mobile-money-webhook.controller';
import { CINETPAY_CLIENT } from './mobile-money/cinetpay.tokens';
import { SandboxCinetPayClient } from './mobile-money/sandbox-cinetpay.client';
import { LEDGER_PORT } from './ports/ledger.port';

/**
 * Ledger — deux implémentations de LedgerPort :
 * - MockLedgerAdapter : compta append-only locale (défaut LEDGER_PORT)
 * - MobileMoneyAdapter : collecte CinetPay sandbox (compta déléguée + USSD/HMAC)
 *
 * Les consommateurs métier injectent LEDGER_PORT (mock par défaut).
 * La collecte async s'expose via MobileMoneyAdapter / endpoints mobile-money.
 */
@Module({
  controllers: [LedgerAdapterController, MobileMoneyWebhookController],
  providers: [
    MockLedgerAdapter,
    SandboxCinetPayClient,
    {
      provide: CINETPAY_CLIENT,
      useExisting: SandboxCinetPayClient,
    },
    MobileMoneyAdapter,
    {
      provide: LEDGER_PORT,
      useExisting: MockLedgerAdapter,
    },
    LedgerAdapterService,
  ],
  exports: [LEDGER_PORT, MobileMoneyAdapter],
})
export class LedgerAdapterModule {}
