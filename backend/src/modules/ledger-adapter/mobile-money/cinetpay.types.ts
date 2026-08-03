/** Payload notification webhook CinetPay (form POST). */
export type CinetPayWebhookBody = {
  cpm_site_id: string;
  cpm_trans_id: string;
  cpm_trans_date: string;
  cpm_amount: string;
  cpm_currency: string;
  signature: string;
  payment_method: string;
  cel_phone_num: string;
  cpm_phone_prefixe: string;
  cpm_language: string;
  cpm_version: string;
  cpm_payment_config: string;
  cpm_page_action: string;
  cpm_custom: string;
  cpm_designation: string;
  /** Statut / message — `SUCCES` si paiement OK. */
  cpm_error_message: string;
};

export type InitiateCinetPayPaymentInput = {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  notifyUrl: string;
  returnUrl?: string;
  phone: string;
  channels?: string;
  custom?: string;
};

export type InitiateCinetPayPaymentResult = {
  providerRef: string;
  paymentUrl?: string;
  ussdHint?: string;
  raw?: unknown;
};

/**
 * Client agrégateur CinetPay (sandbox ou HTTP réel).
 * En sandbox : simule le push USSD sans appel réseau.
 */
export interface CinetPayClient {
  initiatePayment(
    input: InitiateCinetPayPaymentInput,
  ): Promise<InitiateCinetPayPaymentResult>;

  /**
   * Vérifie le statut auprès de CinetPay (API check).
   * En sandbox, peut déduire du payload déjà authentifié par HMAC.
   */
  checkTransaction(transactionId: string): Promise<{
    status: 'ACCEPTED' | 'REFUSED' | 'PENDING' | 'UNKNOWN';
    amount?: number;
    currency?: string;
  }>;
}
