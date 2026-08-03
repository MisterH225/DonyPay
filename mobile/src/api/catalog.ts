import { apiRequest } from './client';
import type { Product } from './types';

export function getProduct(productId: string) {
  return apiRequest<Product>(`/catalog/products/${productId}`);
}

export function listShopProducts(shopId: string) {
  return apiRequest<Product[]>(`/catalog/shops/${shopId}/products`);
}
