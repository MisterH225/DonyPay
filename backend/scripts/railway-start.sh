#!/bin/sh
set -eu

# Si PGPORT (5432) a été collé par erreur dans PORT, l'API ne doit pas l'utiliser.
if [ "${PORT:-}" = "5432" ] || [ "${PORT:-}" = "${PGPORT:-}" ]; then
  echo "[railway-start] WARN: PORT=${PORT} ressemble au port Postgres — forcé à 3000."
  echo "[railway-start] Supprime la variable PORT du service API (Railway en fournit une)."
  export PORT=3000
fi

echo "[railway-start] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-unset}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway-start] ERROR: DATABASE_URL is not set."
  echo "[railway-start] Sur Railway: Variables → DATABASE_URL = \${{Postgres.DATABASE_URL}}"
  exit 1
fi

# Log host only (jamais le mot de passe)
DB_HOST=$(printf '%s' "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
echo "[railway-start] DATABASE_URL host=${DB_HOST:-unknown}"

echo "[railway-start] Running prisma migrate deploy..."
if ! npx prisma migrate deploy; then
  echo "[railway-start] ERROR: prisma migrate deploy failed (P1001 = DB injoignable)."
  echo "[railway-start] Utilise le Postgres Railway: Variables → DATABASE_URL = \${{Postgres.DATABASE_URL}}"
  echo "[railway-start] Ou Supabase Session pooler (pas db.xxx.supabase.co:5432 direct)."
  exit 1
fi

echo "[railway-start] Starting NestJS on 0.0.0.0:${PORT:-3000}"
exec node dist/main.js
