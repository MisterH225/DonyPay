import { Injectable, Logger } from '@nestjs/common';
import type {
  CinetPayClient,
  InitiateCinetPayPaymentInput,
  InitiateCinetPayPaymentResult,
} from './cinetpay.types';

/**
 * Client CinetPay sandbox : aucun appel réseau.
 * Simule l'initiation + notification push USSD (log console).
 */
@Injectable()
export class SandboxCinetPayClient implements CinetPayClient {
  private readonly logger = new Logger(SandboxCinetPayClient.name);
  private readonly statuses = new Map<string, 'ACCEPTED' | 'REFUSED' | 'PENDING'>();

  async initiatePayment(
    input: InitiateCinetPayPaymentInput,
  ): Promise<InitiateCinetPayPaymentResult> {
    const ussdHint = `*144*${input.amount}# (sandbox USSD → ${input.phone})`;

    this.statuses.set(input.transactionId, 'PENDING');

    this.logger.log(
      `[CinetPay sandbox] Push USSD initié trans=${input.transactionId} amount=${input.amount} ${input.currency} phone=${input.phone} notify=${input.notifyUrl}`,
    );
    this.logger.log(`[CinetPay sandbox] USSD hint: ${ussdHint}`);

    return {
      providerRef: input.transactionId,
      ussdHint,
      paymentUrl: `https://sandbox.cinetpay.com/pay/${input.transactionId}`,
      raw: { sandbox: true, channels: input.channels ?? 'MOBILE_MONEY' },
    };
  }

  async checkTransaction(transactionId: string): Promise<{
    status: 'ACCEPTED' | 'REFUSED' | 'PENDING' | 'UNKNOWN';
    amount?: number;
    currency?: string;
  }> {
    const status = this.statuses.get(transactionId) ?? 'UNKNOWN';
    return { status };
  }

  /** Utilisé par le simulateur sandbox pour marquer un statut avant check. */
  setSandboxStatus(
    transactionId: string,
    status: 'ACCEPTED' | 'REFUSED' | 'PENDING',
  ) {
    this.statuses.set(transactionId, status);
  }
}
