import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import { displayName, formatDate } from '@/lib/format';
import type { KycPendingItem } from '@/lib/types';

export default async function KycPage() {
  let items: KycPendingItem[] = [];
  let error: string | null = null;

  try {
    items = await adminFetch<KycPendingItem[]>('/admin/kyc/pending');
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erreur';
  }

  return (
    <>
      <h1 className="page-title">Revue KYC</h1>
      <p className="page-sub">Dossiers en attente avec au moins un document.</p>

      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        {items.length === 0 ? (
          <p className="muted">Aucun KYC en attente.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Documents</th>
                <th>Mis à jour</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.userId}>
                  <td>
                    <strong>{displayName(item)}</strong>
                    <div className="muted">{item.email}</div>
                  </td>
                  <td>{item.documents.length}</td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td>
                    <Link href={`/kyc/${item.userId}`}>Revue →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
