'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Connexion impossible');
        return;
      }
      router.replace(params.get('next') || '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={onSubmit}>
        <div>
          <img
            className="login-logo"
            src="/brand/logo-full.png"
            alt="DôniPay"
            width={260}
            height={62}
          />
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Accès réservé aux opérateurs. Non disponible aux utilisateurs
            finaux.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe admin
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Entrer'}
        </button>
      </form>
    </div>
  );
}
