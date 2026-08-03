'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/api';

export async function approveKycAction(userId: string) {
  await adminFetch(`/admin/kyc/${userId}/approve`, { method: 'POST' });
  revalidatePath('/kyc');
  revalidatePath(`/kyc/${userId}`);
  revalidatePath('/');
}

export async function rejectKycAction(userId: string, reason: string) {
  await adminFetch(`/admin/kyc/${userId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  revalidatePath('/kyc');
  revalidatePath(`/kyc/${userId}`);
  revalidatePath('/');
}
