import { apiRequest } from './client';
import type { PaymentLinkCreated } from './types';

export function createPaymentLink(installmentId: string) {
  return apiRequest<PaymentLinkCreated>('/payment-links', {
    method: 'POST',
    body: JSON.stringify({ installmentId }),
  });
}
