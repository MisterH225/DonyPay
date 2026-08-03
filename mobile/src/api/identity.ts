import { apiRequest, apiUpload } from './client';
import type { KycStatus, User } from './types';

export function createUser(input: {
  email: string;
  phone?: string;
  type: 'individual' | 'company';
  firstName?: string;
  lastName?: string;
}) {
  return apiRequest<User>(
    '/identity/users',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { skipAuth: true },
  );
}

export function getMe() {
  return apiRequest<User>('/identity/me');
}

/** @deprecated Utiliser getMe() — conservé pour compat. */
export function getUser(_userId?: string) {
  return getMe();
}

export function getKycStatus(_userId?: string) {
  return apiRequest<KycStatus>('/identity/me/kyc');
}

export function uploadIdentityDocument(
  _userId: string | undefined,
  file: { uri: string; name: string; type: string },
) {
  return apiUpload('/identity/me/documents/identity', file);
}

/** Selfie : backend n'a pas encore de type dédié — on utilise proof_of_address. */
export function uploadSelfieDocument(
  _userId: string | undefined,
  file: { uri: string; name: string; type: string },
) {
  return apiUpload('/identity/me/documents/address', {
    ...file,
    name: file.name.startsWith('selfie') ? file.name : `selfie-${file.name}`,
  });
}
