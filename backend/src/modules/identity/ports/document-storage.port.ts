export const DOCUMENT_STORAGE_PORT = Symbol('DOCUMENT_STORAGE_PORT');

export type StoredDocument = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type DocumentFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Stockage des pièces KYC (local aujourd'hui, objet S3/Supabase Storage demain).
 */
export interface DocumentStoragePort {
  store(userId: string, file: DocumentFile): Promise<StoredDocument>;
}
