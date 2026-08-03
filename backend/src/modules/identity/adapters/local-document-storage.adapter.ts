import { Injectable } from '@nestjs/common';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import {
  DocumentFile,
  DocumentStoragePort,
  StoredDocument,
} from '../ports/document-storage.port';

@Injectable()
export class LocalDocumentStorageAdapter implements DocumentStoragePort {
  private readonly rootDir =
    process.env.KYC_UPLOAD_DIR ?? join(process.cwd(), 'uploads', 'kyc');

  async store(userId: string, file: DocumentFile): Promise<StoredDocument> {
    const userDir = join(this.rootDir, userId);
    await mkdir(userDir, { recursive: true });

    const extension = this.extensionFromName(file.originalName);
    const storageKey = join(userId, `${randomUUID()}${extension}`);
    const absolutePath = join(this.rootDir, storageKey);

    await pipeline(Readable.from(file.buffer), createWriteStream(absolutePath));

    return {
      storageKey: storageKey.replace(/\\/g, '/'),
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
  }

  private extensionFromName(name: string): string {
    const idx = name.lastIndexOf('.');
    if (idx <= 0) return '';
    return name.slice(idx).toLowerCase();
  }
}
