import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import { displayName, formatDate } from '@/lib/format';
import type { DisputeListItem } from '@/lib/types';

type Props = { searchParams: Promise<{ status?: string }> };

export default async function DisputesPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  let items: DisputeListItem[] = [];
  let error: string | null = null;

  try {
    items = await adminFetch<DisputeListItem[]>(`/admin/disputes${query}`);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erreur';
  }

  const filters = [
    { href: '/disputes', label: 'Tous', value: undefined },
    { href: '/disputes?status=open', label: 'Open', value: 'open' },
    {
      href: '/disputes?status=in_progress',
      label: 'In progress',
      value: 'in_progress',
    },
    { href: '/disputes?status=resolved', label: 'Resolved', value: 'resolved' },
    { href: '/disputes?status=rejected', label: 'Rejected', value: 'rejected' },
  ];

  return (
    <>
      <h1 className="page-title">Litiges</h1>
      <p className="page-sub">Gestion des réclamations (module disputes).</p>

      <div className="row" style={{ marginBottom: 16 }}>
        {filters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.href}
            className={`badge ${status === filter.value || (!status && !filter.value) ? 'in_progress' : 'pending'}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        {items.length === 0 ? (
          <p className="muted">Aucun litige.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Ouvert par</th>
                <th>Motif</th>
                <th>Statut</th>
                <th>Créé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.subjectType}</div>
                  </td>
                  <td>{displayName(item.openedBy)}</td>
                  <td>{item.reason}</td>
                  <td>
                    <span className={`badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    <Link href={`/disputes/${item.id}`}>Gérer →</Link>
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
