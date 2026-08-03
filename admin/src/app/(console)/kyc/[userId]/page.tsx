import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KycReviewForm } from '@/components/KycReviewForm';
import { adminFetch, AdminApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { KycStatus } from '@/lib/types';

type Props = { params: Promise<{ userId: string }> };

export default async function KycDetailPage({ params }: Props) {
  const { userId } = await params;
  let status: KycStatus;

  try {
    status = await adminFetch<KycStatus>(`/admin/kyc/${userId}`);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <p className="muted">
        <Link href="/kyc">← KYC</Link>
      </p>
      <h1 className="page-title">Dossier {userId.slice(0, 8)}</h1>
      <p className="page-sub">
        Statut actuel : <span className={`badge ${status.status}`}>{status.status}</span>
      </p>

      <div className="stack">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Documents</h2>
          {status.documents.length === 0 ? (
            <p className="muted">Aucun document.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Fichier</th>
                  <th>Taille</th>
                  <th>Upload</th>
                </tr>
              </thead>
              <tbody>
                {status.documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.type}</td>
                    <td>{doc.originalName}</td>
                    <td>{Math.round(doc.sizeBytes / 1024)} Ko</td>
                    <td>{formatDate(doc.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {status.rejectReason ? (
            <p className="error">Motif rejet : {status.rejectReason}</p>
          ) : null}
        </div>

        {status.status === 'pending' ? (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Décision manuelle</h2>
            <KycReviewForm userId={userId} />
          </div>
        ) : null}
      </div>
    </>
  );
}
