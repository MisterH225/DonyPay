const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

/**
 * Extrait shopId / productId depuis un QR DonyPay
 * (`…/p/{shopId}/{productId}`) ou un UUID produit brut.
 */
export function parseProductQr(raw: string): {
  shopId?: string;
  productId?: string;
  code: string;
} {
  const value = raw.trim();
  const matches = value.match(UUID_RE) ?? [];

  if (matches.length >= 2 && /\/p\//i.test(value)) {
    return {
      shopId: matches[matches.length - 2],
      productId: matches[matches.length - 1],
      code: value,
    };
  }

  if (matches.length === 1) {
    return { productId: matches[0], code: value };
  }

  return { code: value };
}
