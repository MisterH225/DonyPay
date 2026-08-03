import { Module } from '@nestjs/common';
import { LocalDisputeAttachmentStorageAdapter } from './adapters/local-dispute-attachment-storage.adapter';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { DISPUTE_ATTACHMENT_STORAGE_PORT } from './ports/dispute-attachment-storage.port';

/**
 * Module litiges — réclamations liées à un plan d'épargne ou un paiement délégué.
 * Pièces jointes via DISPUTE_ATTACHMENT_STORAGE_PORT (adaptateur local par défaut).
 */
@Module({
  controllers: [DisputesController],
  providers: [
    LocalDisputeAttachmentStorageAdapter,
    {
      provide: DISPUTE_ATTACHMENT_STORAGE_PORT,
      useExisting: LocalDisputeAttachmentStorageAdapter,
    },
    DisputesService,
  ],
  exports: [DisputesService],
})
export class DisputesModule {}
