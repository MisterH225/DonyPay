export function getApiUrl(): string {
  return (process.env.DONYPAY_API_URL ?? 'http://localhost:3000/api').replace(
    /\/$/,
    '',
  );
}

export function getAdminApiKey(): string {
  const key = process.env.ADMIN_API_KEY?.trim();
  if (!key) throw new Error('ADMIN_API_KEY is not configured');
  return key;
}

export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) throw new Error('ADMIN_PASSWORD is not configured');
  return password;
}

export function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_API_KEY?.trim() ||
    'dev-only-insecure-secret'
  );
}
