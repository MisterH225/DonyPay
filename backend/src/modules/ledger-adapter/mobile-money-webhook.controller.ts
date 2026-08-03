import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MobileMoneyAdapter } from './adapters/mobile-money.adapter';
import { InitiateMobileMoneyCollectionDto } from './dto/initiate-mobile-money-collection.dto';
import { SandboxSimulateCallbackDto } from './dto/sandbox-simulate-callback.dto';
import type { CinetPayWebhookBody } from './mobile-money/cinetpay.types';

/**
 * Collecte Mobile Money (CinetPay) — initiation + webhook HMAC.
 * Préfixe : `/api/ledger-adapter/mobile-money`
 */
@Controller('ledger-adapter/mobile-money')
export class MobileMoneyWebhookController {
  constructor(private readonly mobileMoney: MobileMoneyAdapter) {}

  @Post('collections')
  initiate(@Body() dto: InitiateMobileMoneyCollectionDto) {
    return this.mobileMoney.initiateCollection(dto);
  }

  @Get('collections/:providerRef')
  getCollection(@Param('providerRef') providerRef: string) {
    return this.mobileMoney.getCollection(providerRef);
  }

  /**
   * Notification CinetPay.
   * Header obligatoire : `x-token` (HMAC-SHA256).
   * Sans signature valide → 401, aucun crédit ledger.
   */
  @Post('webhook')
  webhook(
    @Body() body: CinetPayWebhookBody,
    @Headers('x-token') xToken?: string,
  ) {
    return this.mobileMoney.handleWebhook(body, xToken);
  }

  /** Sandbox : simule le callback USSD signé HMAC. */
  @Post('sandbox/simulate-callback')
  simulate(@Body() dto: SandboxSimulateCallbackDto) {
    if (!this.mobileMoney.isSandbox()) {
      throw new ServiceUnavailableException('Sandbox mode disabled');
    }
    return this.mobileMoney.simulateSandboxCallback(
      dto.providerRef,
      dto.success ?? true,
    );
  }
}
