import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminFetch, AdminApiError } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import type { LedgerAccount, LedgerEntry } from '@/lib/types';

type Props = { params: Promise<{ accountId: string }> };

export default async function LedgerAccountPage({ params }: Props) {
  const { accountId } = await params;
  let account: LedgerAccount;
  let entries: LedgerEntry[] = [];

  try {
    [account, entries] = await Promise.all([
      adminFetch<LedgerAccount>(`/admin/ledger/accounts/${accountId}`),
      adminFetch<LedgerEntry[]>(
        `/admin/ledger/accounts/${accountId}/entries?take=200`,
      ),
    ]);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <p className="muted">
        <Link href="/ledger">← Ledger</Link>
      </p>
      <h1 className="page-title">Compte {accountId.slice(0, 8)}</h1>
      <p className="page-sub">
        {account.kind} · solde {formatMoney(account.balance)} · lecture seule
      </p>

      <div className="card">
        {entries.length === 0 ? (
          <p className="muted">Aucune écriture.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Solde après</th>
                <th>Métadonnées</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>
                    <span className={`badge ${entry.type}`}>{entry.type}</span>
                  </td>
                  <td>{formatMoney(entry.amount)}</td>
                  <td>{formatMoney(entry.balanceAfter)}</td>
                  <td>
                    <code style={{ fontSize: 12 }}>
                      {entry.metadata
                        ? JSON.stringify(entry.metadata)
                        : '—'}
                    </code>
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
