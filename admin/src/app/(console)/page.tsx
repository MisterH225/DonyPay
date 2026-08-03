import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import type { DisputeListItem, KycPendingItem, LedgerAccount } from '@/lib/types';

export default async function HomePage() {
  let kycCount = 0;
  let openDisputes = 0;
  let accounts = 0;
  let error: string | null = null;

  try {
    const [kyc, disputes, ledger] = await Promise.all([
      adminFetch<KycPendingItem[]>('/admin/kyc/pending'),
      adminFetch<DisputeListItem[]>('/admin/disputes?status=open'),
      adminFetch<LedgerAccount[]>('/admin/ledger/accounts'),
    ]);
    kycCount = kyc.length;
    openDisputes = disputes.length;
    accounts = ledger.length;
  } catch (err) {
    error = err instanceof Error ? err.message : 'API admin indisponible';
  }

  return (
    <>
      <h1 className="page-title">Tableau de bord</h1>
      <p className="page-sub">
        Revue KYC, consultation ledger et gestion des litiges.
      </p>

      {error ? (
        <div className="card">
          <p className="error">{error}</p>
          <p className="muted">
            Vérifie `DONYPAY_API_URL` et `ADMIN_API_KEY` dans `admin/.env`.
          </p>
        </div>
      ) : (
        <div className="stack">
          <div className="row">
            <Link href="/kyc" className="card" style={{ flex: 1, minWidth: 200 }}>
              <div className="muted">KYC en attente</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{kycCount}</div>
            </Link>
            <Link
              href="/disputes"
              className="card"
              style={{ flex: 1, minWidth: 200 }}
            >
              <div className="muted">Litiges ouverts</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{openDisputes}</div>
            </Link>
            <Link
              href="/ledger"
              className="card"
              style={{ flex: 1, minWidth: 200 }}
            >
              <div className="muted">Comptes ledger</div>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{accounts}</div>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
