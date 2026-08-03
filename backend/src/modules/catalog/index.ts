export { CatalogModule } from './catalog.module';
export { ShopsService } from './shops.service';
export { ProductsService } from './products.service';
export {
  CATALOG_STORAGE_PORT,
  type CatalogFile,
  type CatalogStoragePort,
  type StoredCatalogFile,
} from './ports/catalog-storage.port';
export { QR_CODE_PORT, type QrCodePort } from './ports/qr-code.port';
