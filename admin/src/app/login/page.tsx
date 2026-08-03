import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-wrap">
          <div className="card login-card">Chargement…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
