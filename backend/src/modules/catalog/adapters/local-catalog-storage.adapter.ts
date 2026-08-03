import { Injectable } from '@nestjs/common';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import {
  CatalogFile,
  CatalogStoragePort,
  StoredCatalogFile,
} from '../ports/catalog-storage.port';

@Injectable()
export class LocalCatalogStorageAdapter implements CatalogStoragePort {
  private readonly rootDir =
    process.env.CATALOG_UPLOAD_DIR ?? join(process.cwd(), 'uploads', 'catalog');

  async storePhoto(
    shopId: string,
    file: CatalogFile,
  ): Promise<StoredCatalogFile> {
    const dir = join(this.rootDir, shopId, 'photos');
    await mkdir(dir, { recursive: true });

    const extension = this.extensionFromName(file.originalName);
    const relativeKey = join(shopId, 'photos', `${randomUUID()}${extension}`);
    const absolutePath = join(this.rootDir, relativeKey);

    await pipeline(Readable.from(file.buffer), createWriteStream(absolutePath));

    return {
      storageKey: relativeKey.replace(/\\/g, '/'),
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }

  async storeQrImage(
    shopId: string,
    productId: string,
    png: Buffer,
  ): Promise<string> {
    const dir = join(this.rootDir, shopId, 'qr');
    await mkdir(dir, { recursive: true });

    const relativeKey = join(shopId, 'qr', `${productId}.png`);
    const absolutePath = join(this.rootDir, relativeKey);

    await pipeline(Readable.from(png), createWriteStream(absolutePath));

    return relativeKey.replace(/\\/g, '/');
  }

  private extensionFromName(name: string): string {
    const idx = name.lastIndexOf('.');
    if (idx <= 0) return '';
    return name.slice(idx).toLowerCase();
  }
}
