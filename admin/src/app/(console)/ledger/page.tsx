import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { LedgerAccount } from '@/lib/types';

export default async function LedgerPage() {
  let accounts: LedgerAccount[] = [];
  let error: string | null = null;

  try {
    accounts = await adminFetch<LedgerAccount[]>('/admin/ledger/accounts');
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erreur';
  }

  return (
    <>
      <h1 className="page-title">Ledger</h1>
      <p className="page-sub">Consultation en lecture seule des comptes.</p>
      {error ? <p className="error">{error}</p> : null}

      <div className="card">
        {accounts.length === 0 ? (
          <p className="muted">Aucun compte ledger.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Kind</th>
                <th>User</th>
                <th>Écritures</th>
                <th>Créé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <code>{account.id.slice(0, 8)}</code>
                  </td>
                  <td>{account.kind}</td>
                  <td>
                    <code>{account.userId?.slice(0, 8) ?? '—'}</code>
                  </td>
                  <td>{account._count?.entries ?? 0}</td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td>
                    <Link href={`/ledger/${account.id}`}>Voir →</Link>
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
