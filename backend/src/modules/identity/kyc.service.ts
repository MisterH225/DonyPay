import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { KycDocumentType, KycStatus, type KycDocument } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DOCUMENT_STORAGE_PORT,
  type DocumentFile,
  type DocumentStoragePort,
} from './ports/document-storage.port';
import {
  KYC_PROVIDER_PORT,
  type KycProviderPort,
} from './ports/kyc-provider.port';
import { UsersService } from './users.service';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
    @Optional()
    @Inject(KYC_PROVIDER_PORT)
    private readonly kycProvider?: KycProviderPort,
  ) {}

  async getStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    const documents = await this.prisma.kycDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });

    return {
      userId: user.id,
      status: user.kycStatus,
      reviewedAt: user.kycReviewedAt,
      rejectReason: user.kycRejectReason,
      externalKycId: user.externalKycId,
      documents: documents.map((doc) => this.toDocumentView(doc)),
    };
  }

  async uploadIdentityDocument(
    userId: string,
    file: DocumentFile,
  ): Promise<KycDocument> {
    return this.uploadDocument(userId, KycDocumentType.identity_document, file);
  }

  async uploadProofOfAddress(
    userId: string,
    file: DocumentFile,
  ): Promise<KycDocument> {
    return this.uploadDocument(userId, KycDocumentType.proof_of_address, file);
  }

  /**
   * Soumet le dossier KYC au prestataire externe via KycProviderPort.
   * Aucune implémentation n'est fournie par défaut.
   */
  async submitToExternalProvider(userId: string) {
    if (!this.kycProvider) {
      throw new ServiceUnavailableException(
        'KYC provider is not configured. Bind KYC_PROVIDER_PORT to an adapter.',
      );
    }

    const user = await this.usersService.findById(userId);
    const documents = await this.prisma.kycDocument.findMany({
      where: { userId },
    });

    const hasIdentity = documents.some(
      (doc) => doc.type === KycDocumentType.identity_document,
    );
    const hasAddress = documents.some(
      (doc) => doc.type === KycDocumentType.proof_of_address,
    );

    if (!hasIdentity || !hasAddress) {
      throw new BadRequestException(
        'Both identity_document and proof_of_address are required before KYC submission',
      );
    }

    const result = await this.kycProvider.submitVerification({
      userId: user.id,
      email: user.email,
      type: user.type,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      documentStorageKeys: documents.map((doc) => doc.storageKey),
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        externalKycId: result.externalId,
        kycStatus: result.status,
        kycReviewedAt:
          result.status === KycStatus.pending ? null : new Date(),
      },
    });

    return {
      userId: updated.id,
      status: updated.kycStatus,
      externalKycId: updated.externalKycId,
    };
  }

  async syncExternalStatus(userId: string) {
    if (!this.kycProvider) {
      throw new ServiceUnavailableException(
        'KYC provider is not configured. Bind KYC_PROVIDER_PORT to an adapter.',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user.externalKycId) {
      throw new BadRequestException('User has no external KYC reference');
    }

    const result = await this.kycProvider.getVerificationStatus(
      user.externalKycId,
    );

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: result.status,
        kycRejectReason: result.rejectReason ?? null,
        kycReviewedAt:
          result.status === KycStatus.pending ? null : new Date(),
      },
    });

    return {
      userId: updated.id,
      status: updated.kycStatus,
      rejectReason: updated.kycRejectReason,
      externalKycId: updated.externalKycId,
    };
  }

  private async uploadDocument(
    userId: string,
    type: KycDocumentType,
    file: DocumentFile,
  ): Promise<KycDocument> {
    await this.usersService.findById(userId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('File content is required');
    }

    const stored = await this.storage.store(userId, file);

    const document = await this.prisma.kycDocument.create({
      data: {
        userId,
        type,
        storageKey: stored.storageKey,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });

    // Nouveau document → dossier à revoir.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: KycStatus.pending,
        kycReviewedAt: null,
        kycRejectReason: null,
      },
    });

    return document;
  }

  private toDocumentView(doc: KycDocument) {
    return {
      id: doc.id,
      type: doc.type,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt,
    };
  }
}
