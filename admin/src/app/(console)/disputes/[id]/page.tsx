import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DisputeManageForm } from '@/components/DisputeManageForm';
import { adminFetch, AdminApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { DisputeDetail } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };

export default async function DisputeDetailPage({ params }: Props) {
  const { id } = await params;
  let dispute: DisputeDetail;

  try {
    dispute = await adminFetch<DisputeDetail>(`/admin/disputes/${id}`);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <p className="muted">
        <Link href="/disputes">← Litiges</Link>
      </p>
      <h1 className="page-title">{dispute.title}</h1>
      <p className="page-sub">
        <span className={`badge ${dispute.status}`}>{dispute.status}</span> ·{' '}
        {dispute.reason} · {dispute.subjectType}
      </p>

      <div className="stack">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Description</h2>
          <p>{dispute.description}</p>
          {dispute.resolutionNote ? (
            <p>
              <strong>Note :</strong> {dispute.resolutionNote}
            </p>
          ) : null}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Historique</h2>
          {dispute.messages.length === 0 ? (
            <p className="muted">Aucun message.</p>
          ) : (
            <div className="stack">
              {dispute.messages.map((msg) => (
                <div key={msg.id}>
                  <div className="muted">
                    {formatDate(msg.createdAt)} · {msg.authorId.slice(0, 8)}
                  </div>
                  <div>{msg.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DisputeManageForm disputeId={id} status={dispute.status} />
      </div>
    </>
  );
}
