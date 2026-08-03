import { Module } from '@nestjs/common';
import { LocalCatalogStorageAdapter } from './adapters/local-catalog-storage.adapter';
import { QrCodeGeneratorAdapter } from './adapters/qrcode-generator.adapter';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CATALOG_STORAGE_PORT } from './ports/catalog-storage.port';
import { QR_CODE_PORT } from './ports/qr-code.port';
import { ProductsService } from './products.service';
import { ShopsService } from './shops.service';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    ShopsService,
    ProductsService,
    LocalCatalogStorageAdapter,
    {
      provide: CATALOG_STORAGE_PORT,
      useExisting: LocalCatalogStorageAdapter,
    },
    QrCodeGeneratorAdapter,
    {
      provide: QR_CODE_PORT,
      useExisting: QrCodeGeneratorAdapter,
    },
  ],
  exports: [ShopsService, ProductsService],
})
export class CatalogModule {}
