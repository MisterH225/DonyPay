import { Module } from '@nestjs/common';
import { ConsoleSmsSenderAdapter } from './adapters/console-sms-sender.adapter';
import { LocalDocumentStorageAdapter } from './adapters/local-document-storage.adapter';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { KycService } from './kyc.service';
import { DOCUMENT_STORAGE_PORT } from './ports/document-storage.port';
import { SMS_SENDER_PORT } from './ports/sms-sender.port';
import { TwoFactorService } from './two-factor.service';
import { UsersService } from './users.service';

/**
 * Module identity — User, KYC, documents, 2FA.
 *
 * Prestataire KYC tiers : déclarer dans un module racine / config :
 * `{ provide: KYC_PROVIDER_PORT, useClass: YourExternalKycAdapter }`
 * Aucune implémentation concrète n'est fournie ici.
 */
@Module({
  controllers: [IdentityController],
  providers: [
    IdentityService,
    UsersService,
    KycService,
    TwoFactorService,
    LocalDocumentStorageAdapter,
    {
      provide: DOCUMENT_STORAGE_PORT,
      useExisting: LocalDocumentStorageAdapter,
    },
    ConsoleSmsSenderAdapter,
    {
      provide: SMS_SENDER_PORT,
      useExisting: ConsoleSmsSenderAdapter,
    },
  ],
  exports: [UsersService, KycService, TwoFactorService],
})
export class IdentityModule {}
