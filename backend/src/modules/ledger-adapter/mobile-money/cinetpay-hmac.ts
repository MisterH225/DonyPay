import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Champs CinetPay notification — ordre de concaténation pour le HMAC x-token.
 * @see https://docs.cinetpay.com/api/1.0-en/checkout/hmac
 */
export const CINETPAY_HMAC_FIELDS = [
  'cpm_site_id',
  'cpm_trans_id',
  'cpm_trans_date',
  'cpm_amount',
  'cpm_currency',
  'signature',
  'payment_method',
  'cel_phone_num',
  'cpm_phone_prefixe',
  'cpm_language',
  'cpm_version',
  'cpm_payment_config',
  'cpm_page_action',
  'cpm_custom',
  'cpm_designation',
  'cpm_error_message',
] as const;

export type CinetPayNotifyPayload = Record<string, string | undefined>;

/**
 * Construit la chaîne à signer (concaténation ordonnée des champs notification).
 */
export function buildCinetPayHmacPayload(
  body: CinetPayNotifyPayload,
): string {
  return CINETPAY_HMAC_FIELDS.map((field) => body[field] ?? '').join('');
}

/**
 * Génère le token HMAC-SHA256 (secret = clé secrète marchand CinetPay).
 */
export function signCinetPayNotify(
  body: CinetPayNotifyPayload,
  secretKey: string,
): string {
  const data = buildCinetPayHmacPayload(body);
  return createHmac('sha256', secretKey).update(data, 'utf8').digest('hex');
}

/**
 * Vérifie le header `x-token` contre le corps de notification.
 * Comparaison timing-safe — ne jamais court-circuiter si le header est absent.
 */
export function verifyCinetPayHmac(
  body: CinetPayNotifyPayload,
  receivedToken: string | undefined,
  secretKey: string,
): boolean {
  if (!receivedToken || !secretKey) {
    return false;
  }

  const expected = signCinetPayNotify(body, secretKey);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(receivedToken, 'utf8');

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
