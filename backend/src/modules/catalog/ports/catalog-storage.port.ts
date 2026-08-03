export const CATALOG_STORAGE_PORT = Symbol('CATALOG_STORAGE_PORT');

export type CatalogFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type StoredCatalogFile = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

/** Stockage des photos produits et images QR. */
export interface CatalogStoragePort {
  storePhoto(shopId: string, file: CatalogFile): Promise<StoredCatalogFile>;
  storeQrImage(shopId: string, productId: string, png: Buffer): Promise<string>;
}
