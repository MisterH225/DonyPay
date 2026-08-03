import { apiMultipart, apiRequest } from './client';
import type { Product, Shop } from './types';

export function createShop(input: { name: string; description?: string }) {
  return apiRequest<Shop>('/catalog/shops', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getShop(shopId: string) {
  return apiRequest<Shop>(`/catalog/shops/${shopId}`);
}

export function getMyShop() {
  return apiRequest<Shop>('/catalog/sellers/me/shop');
}

/** @deprecated Utiliser getMyShop(). */
export function getShopBySeller(_sellerId?: string) {
  return getMyShop();
}

export function getProduct(productId: string) {
  return apiRequest<Product>(`/catalog/products/${productId}`);
}

export function listShopProducts(shopId: string) {
  return apiRequest<Product[]>(`/catalog/shops/${shopId}/products`);
}

export function createProduct(
  shopId: string,
  input: { name: string; price: number },
  photo?: { uri: string; name: string; type: string },
) {
  return apiMultipart<Product>(
    `/catalog/shops/${shopId}/products`,
    {
      name: input.name,
      price: String(input.price),
    },
    photo
      ? {
          field: 'photo',
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        }
      : undefined,
  );
}
