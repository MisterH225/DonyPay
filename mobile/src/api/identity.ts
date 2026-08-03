import { apiRequest, apiUpload } from './client';
import type { KycStatus, User } from './types';

export function createUser(input: {
  email: string;
  phone?: string;
  type: 'individual' | 'company';
  firstName?: string;
  lastName?: string;
}) {
  return apiRequest<User>('/identity/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getUser(userId: string) {
  return apiRequest<User>(`/identity/users/${userId}`);
}

export function getKycStatus(userId: string) {
  return apiRequest<KycStatus>(`/identity/users/${userId}/kyc`);
}

export function uploadIdentityDocument(
  userId: string,
  file: { uri: string; name: string; type: string },
) {
  return apiUpload(`/identity/users/${userId}/documents/identity`, file);
}

/** Selfie : backend n'a pas encore de type dédié — on utilise proof_of_address. */
export function uploadSelfieDocument(
  userId: string,
  file: { uri: string; name: string; type: string },
) {
  return apiUpload(`/identity/users/${userId}/documents/address`, {
    ...file,
    name: file.name.startsWith('selfie') ? file.name : `selfie-${file.name}`,
  });
}
