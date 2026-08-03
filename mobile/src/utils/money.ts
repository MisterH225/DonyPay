export function toNumber(value: string | number | undefined | null): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatXof(value: string | number | undefined | null): string {
  return `${toNumber(value).toLocaleString('fr-FR')} XOF`;
}

export function progressPercent(
  saved: string | number | undefined,
  target: string | number | undefined,
): number {
  const t = toNumber(target);
  if (t <= 0) return 0;
  return Math.min(100, (toNumber(saved) / t) * 100);
}
