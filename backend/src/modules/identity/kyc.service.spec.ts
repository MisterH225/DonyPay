import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  KycDocumentType,
  KycStatus,
  UserType,
  type User,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KycService } from './kyc.service';
import type { DocumentStoragePort } from './ports/document-storage.port';
import type { KycProviderPort } from './ports/kyc-provider.port';
import { UsersService } from './users.service';

describe('KycService', () => {
  const user: User = {
    id: 'user-1',
    email: 'alice@example.com',
    phone: null,
    type: UserType.individual,
    firstName: 'Alice',
    lastName: 'Martin',
    companyName: null,
    siret: null,
    kycStatus: KycStatus.pending,
    kycReviewedAt: null,
    kycRejectReason: null,
    externalKycId: null,
    twoFactorEnabled: false,
    twoFactorMethod: null,
    totpSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let documents: Array<Record<string, unknown>>;
  let prisma: {
    kycDocument: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    user: { update: jest.Mock };
  };
  let storage: DocumentStoragePort;
  let usersService: UsersService;
  let service: KycService;

  beforeEach(() => {
    documents = [];
    prisma = {
      kycDocument: {
        findMany: jest.fn(async () => documents),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const doc = {
            id: `doc-${documents.length + 1}`,
            uploadedAt: new Date(),
            ...data,
          };
          documents.push(doc);
          return doc;
        }),
      },
      user: {
        update: jest.fn(async ({ data }: { data: Partial<User> }) => ({
          ...user,
          ...data,
        })),
      },
    };

    storage = {
      store: jest.fn(async () => ({
        storageKey: 'user-1/id.pdf',
        originalName: 'id.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12,
      })),
    };

    usersService = {
      findById: jest.fn(async () => ({ ...user })),
    } as unknown as UsersService;

    service = new KycService(
      prisma as unknown as PrismaService,
      usersService,
      storage,
    );
  });

  it('uploads identity document and resets KYC to pending', async () => {
    const doc = await service.uploadIdentityDocument('user-1', {
      buffer: Buffer.from('pdf'),
      originalName: 'id.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3,
    });

    expect(doc.type).toBe(KycDocumentType.identity_document);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kycStatus: KycStatus.pending }),
      }),
    );
  });

  it('returns KYC status with documents', async () => {
    documents.push({
      id: 'doc-1',
      type: KycDocumentType.identity_document,
      originalName: 'id.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3,
      uploadedAt: new Date(),
    });

    const status = await service.getStatus('user-1');
    expect(status.status).toBe(KycStatus.pending);
    expect(status.documents).toHaveLength(1);
  });

  it('fails submit when KYC provider is not configured', async () => {
    await expect(service.submitToExternalProvider('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('submits to external KYC provider when bound', async () => {
    documents.push(
      {
        type: KycDocumentType.identity_document,
        storageKey: 'a',
      },
      {
        type: KycDocumentType.proof_of_address,
        storageKey: 'b',
      },
    );

    const provider: KycProviderPort = {
      submitVerification: jest.fn(async () => ({
        externalId: 'ext-1',
        status: KycStatus.pending,
      })),
      getVerificationStatus: jest.fn(),
    };

    service = new KycService(
      prisma as unknown as PrismaService,
      usersService,
      storage,
      provider,
    );

    const result = await service.submitToExternalProvider('user-1');
    expect(result.externalKycId).toBe('ext-1');
    expect(provider.submitVerification).toHaveBeenCalled();
  });

  it('requires both documents before external submit', async () => {
    const provider: KycProviderPort = {
      submitVerification: jest.fn(),
      getVerificationStatus: jest.fn(),
    };

    service = new KycService(
      prisma as unknown as PrismaService,
      usersService,
      storage,
      provider,
    );

    await expect(service.submitToExternalProvider('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
