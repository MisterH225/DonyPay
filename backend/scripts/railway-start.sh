#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

# Si PGPORT (5432) a été collé par erreur dans PORT, l'API ne doit pas l'utiliser.
if [ "${PORT:-}" = "5432" ] || { [ -n "${PGPORT:-}" ] && [ "${PORT:-}" = "${PGPORT}" ]; }; then
  echo "[railway-start] WARN: PORT=${PORT} ressemble au port Postgres — forcé à 3000."
  echo "[railway-start] Supprime la variable PORT du service API (Railway en fournit une)."
  export PORT=3000
fi

echo "[railway-start] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-unset} HOST=${HOST:-0.0.0.0}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway-start] ERROR: DATABASE_URL is not set."
  echo "[railway-start] Sur Railway: Variables → DATABASE_URL = \${{Postgres.DATABASE_URL}}"
  exit 1
fi

# Log host only (jamais le mot de passe)
DB_HOST=$(printf '%s' "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
echo "[railway-start] DATABASE_URL host=${DB_HOST:-unknown}"

case "${DB_HOST}" in
  *supabase.co)
    echo "[railway-start] WARN: host Supabase direct détecté."
    echo "[railway-start] Si migrate échoue (P1001), utilise le Session pooler ou Postgres Railway."
    ;;
esac

echo "[railway-start] Running prisma migrate deploy..."
if ! sh ./scripts/railway-prisma.sh migrate deploy; then
  echo "[railway-start] ERROR: prisma migrate deploy failed (P1001 = DB injoignable)."
  echo "[railway-start] Utilise le Postgres Railway: Variables → DATABASE_URL = \${{Postgres.DATABASE_URL}}"
  echo "[railway-start] Ou Supabase Session pooler (pas db.xxx.supabase.co:5432 direct)."
  exit 1
fi

# Staging / démo : peupler utilisateurs, boutique, plans (sans Mobile Money réel).
if [ "${SEED_DEMO:-}" = "true" ] || [ "${SEED_DEMO:-}" = "1" ]; then
  echo "[railway-start] SEED_DEMO enabled — running prisma db seed…"
  if ! sh ./scripts/railway-prisma.sh db seed; then
    echo "[railway-start] WARN: seed failed (non-bloquant)."
  fi
fi

if [ ! -f dist/main.js ]; then
  echo "[railway-start] ERROR: dist/main.js introuvable — le build Docker a échoué ?"
  ls -la dist 2>/dev/null || true
  exit 1
fi

echo "[railway-start] Starting NestJS on 0.0.0.0:${PORT:-3000}"
exec node dist/main.js
