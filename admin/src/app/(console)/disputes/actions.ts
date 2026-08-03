'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/api';

export async function updateDisputeStatusAction(
  id: string,
  status: string,
  resolutionNote?: string,
) {
  await adminFetch(`/admin/disputes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      resolutionNote: resolutionNote || undefined,
    }),
  });
  revalidatePath('/disputes');
  revalidatePath(`/disputes/${id}`);
  revalidatePath('/');
}

export async function addDisputeMessageAction(id: string, body: string) {
  await adminFetch(`/admin/disputes/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  revalidatePath(`/disputes/${id}`);
}
