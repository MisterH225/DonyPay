export const DISPUTE_ATTACHMENT_STORAGE_PORT = Symbol(
  'DISPUTE_ATTACHMENT_STORAGE_PORT',
);

export type StoredDisputeAttachment = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type DisputeAttachmentFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Stockage des pièces jointes de litige (local aujourd'hui, objet demain).
 */
export interface DisputeAttachmentStoragePort {
  store(
    disputeId: string,
    file: DisputeAttachmentFile,
  ): Promise<StoredDisputeAttachment>;
}
