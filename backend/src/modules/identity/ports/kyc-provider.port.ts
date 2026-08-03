import type { KycStatus } from '@prisma/client';

export const KYC_PROVIDER_PORT = Symbol('KYC_PROVIDER_PORT');

export type ExternalKycApplicant = {
  userId: string;
  email: string;
  type: 'individual' | 'company';
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  documentStorageKeys: string[];
};

export type ExternalKycSubmissionResult = {
  externalId: string;
  status: KycStatus;
};

export type ExternalKycStatusResult = {
  externalId: string;
  status: KycStatus;
  rejectReason?: string;
};

/**
 * Point d'intégration pour un prestataire KYC tiers (Onfido, Persona, etc.).
 * Aucune implémentation concrète n'est fournie pour l'instant :
 * binder `{ provide: KYC_PROVIDER_PORT, useClass: YourProvider }` dans IdentityModule.
 */
export interface KycProviderPort {
  submitVerification(
    applicant: ExternalKycApplicant,
  ): Promise<ExternalKycSubmissionResult>;

  getVerificationStatus(
    externalId: string,
  ): Promise<ExternalKycStatusResult>;
}
