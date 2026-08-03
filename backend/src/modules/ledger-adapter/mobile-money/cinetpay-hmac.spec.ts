import {
  buildCinetPayHmacPayload,
  signCinetPayNotify,
  verifyCinetPayHmac,
} from './cinetpay-hmac';

describe('cinetpay-hmac', () => {
  const body = {
    cpm_site_id: 'site-1',
    cpm_trans_id: 'dp_abc',
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
    cpm_designation: 'Test',
    cpm_error_message: 'SUCCES',
  };

  const secret = 'cinetpay_sandbox_secret';

  it('concatène les champs dans l’ordre documenté', () => {
    expect(buildCinetPayHmacPayload(body)).toBe(
      'site-1dp_abc2026-08-03 12:00:001000XOFsigOM0700000000225frV4SINGLEPAYMENT{}TestSUCCES',
    );
  });

  it('signe et vérifie un token valide', () => {
    const token = signCinetPayNotify(body, secret);
    expect(verifyCinetPayHmac(body, token, secret)).toBe(true);
  });

  it('rejette un token absent, altéré ou mauvais secret', () => {
    const token = signCinetPayNotify(body, secret);
    expect(verifyCinetPayHmac(body, undefined, secret)).toBe(false);
    expect(verifyCinetPayHmac(body, 'deadbeef', secret)).toBe(false);
    expect(verifyCinetPayHmac(body, token, 'other-secret')).toBe(false);
    expect(
      verifyCinetPayHmac({ ...body, cpm_amount: '9999' }, token, secret),
    ).toBe(false);
  });
});
