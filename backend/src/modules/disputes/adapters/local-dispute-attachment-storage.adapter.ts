import { Injectable } from '@nestjs/common';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import {
  DisputeAttachmentFile,
  DisputeAttachmentStoragePort,
  StoredDisputeAttachment,
} from '../ports/dispute-attachment-storage.port';

@Injectable()
export class LocalDisputeAttachmentStorageAdapter implements DisputeAttachmentStoragePort {
  private readonly rootDir =
    process.env.DISPUTE_UPLOAD_DIR ??
    join(process.cwd(), 'uploads', 'disputes');

  async store(
    disputeId: string,
    file: DisputeAttachmentFile,
  ): Promise<StoredDisputeAttachment> {
    const disputeDir = join(this.rootDir, disputeId);
    await mkdir(disputeDir, { recursive: true });

    const extension = this.extensionFromName(file.originalName);
    const storageKey = join(disputeId, `${randomUUID()}${extension}`);
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
