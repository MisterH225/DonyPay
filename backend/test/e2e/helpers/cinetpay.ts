import { signCinetPayNotify } from '../../../src/modules/ledger-adapter/mobile-money/cinetpay-hmac';
import type { CinetPayWebhookBody } from '../../../src/modules/ledger-adapter/mobile-money/cinetpay.types';

export function buildSignedWebhook(
  body: CinetPayWebhookBody,
  secret = process.env.CINETPAY_SECRET_KEY || 'cinetpay_sandbox_secret',
): { body: CinetPayWebhookBody; token: string } {
  return {
    body,
    token: signCinetPayNotify(body, secret),
  };
}

export function sandboxNotifyBody(input: {
  providerRef: string;
  amount: number | string;
  phone?: string;
  success?: boolean;
  collectionId?: string;
}): CinetPayWebhookBody {
  return {
    cpm_site_id: process.env.CINETPAY_SITE_ID || 'sandbox_site',
    cpm_trans_id: input.providerRef,
    cpm_trans_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
    cpm_amount: String(input.amount),
    cpm_currency: 'XOF',
    signature: 'sandbox_signature',
    payment_method: 'OM',
    cel_phone_num: (input.phone ?? '+2250700112233').replace(/^\+/, ''),
    cpm_phone_prefixe: '225',
    cpm_language: 'fr',
    cpm_version: 'V4',
    cpm_payment_config: 'SINGLE',
    cpm_page_action: 'PAYMENT',
    cpm_custom: JSON.stringify({
      collectionId: input.collectionId ?? 'unknown',
    }),
    cpm_designation: 'DonyPay E2E',
    cpm_error_message: input.success === false ? 'FAILED' : 'SUCCES',
  };
}
