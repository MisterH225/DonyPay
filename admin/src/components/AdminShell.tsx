'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/kyc', label: 'KYC' },
  { href: '/ledger', label: 'Ledger' },
  { href: '/disputes', label: 'Litiges' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img
            src="/brand/logo-full.png"
            alt="DôniPay"
            width={180}
            height={43}
          />
          <p className="brand-sub">Console admin — ops uniquement</p>
        </div>
        <nav className="nav">
          {LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'active' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: 28 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => void logout()}
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
