'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveKycAction, rejectKycAction } from '@/app/(console)/kyc/actions';

export function KycReviewForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="stack">
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await approveKycAction(userId);
                router.push('/kyc');
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Échec');
              }
            });
          }}
        >
          Approuver
        </button>
      </div>

      <div>
        <label className="label" htmlFor="reason">
          Motif de rejet
        </label>
        <textarea
          id="reason"
          className="textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Document illisible, selfie non conforme…"
        />
      </div>

      <button
        type="button"
        className="btn danger"
        disabled={pending || !reason.trim()}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await rejectKycAction(userId, reason.trim());
              router.push('/kyc');
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Échec');
            }
          });
        }}
      >
        Rejeter
      </button>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
