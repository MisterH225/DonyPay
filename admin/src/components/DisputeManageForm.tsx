'use client';

import { useState, useTransition } from 'react';
import {
  addDisputeMessageAction,
  updateDisputeStatusAction,
} from '@/app/(console)/disputes/actions';

const TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
};

export function DisputeManageForm({
  disputeId,
  status,
}: {
  disputeId: string;
  status: string;
}) {
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = TRANSITIONS[status] ?? [];

  return (
    <div className="stack">
      {next.length > 0 ? (
        <div className="card stack">
          <h2 style={{ marginTop: 0 }}>Changer le statut</h2>
          <div>
            <label className="label" htmlFor="note">
              Note de résolution (si resolved / rejected)
            </label>
            <textarea
              id="note"
              className="textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="row">
            {next.map((value) => (
              <button
                key={value}
                type="button"
                className={`btn ${value === 'rejected' ? 'danger' : 'primary'}`}
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    try {
                      await updateDisputeStatusAction(
                        disputeId,
                        value,
                        note.trim() || undefined,
                      );
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Échec');
                    }
                  });
                }}
              >
                → {value}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {status !== 'resolved' && status !== 'rejected' ? (
        <div className="card stack">
          <h2 style={{ marginTop: 0 }}>Message ops</h2>
          <textarea
            className="textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Réponse à l’utilisateur…"
          />
          <button
            type="button"
            className="btn secondary"
            disabled={pending || !message.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await addDisputeMessageAction(disputeId, message.trim());
                  setMessage('');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Échec');
                }
              });
            }}
          >
            Envoyer
          </button>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
