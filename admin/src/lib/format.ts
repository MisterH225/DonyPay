export function formatMoney(value: string | number | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString('fr-FR')} XOF`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}

export function displayName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  companyName?: string | null;
} | null): string {
  if (!user) return '—';
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return full || user.companyName || user.email || '—';
}
