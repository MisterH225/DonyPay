#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

# Si PGPORT (5432) a été collé par erreur dans PORT, l'API ne doit pas l'utiliser.
if [ "${PORT:-}" = "5432" ] || { [ -n "${PGPORT:-}" ] && [ "${PORT:-}" = "${PGPORT}" ]; }; then
  echo "[railway-start] WARN: PORT=${PORT} ressemble au port Postgres — forcé à 3000."
  echo "[railway-start] Supprime la variable PORT du service API (Railway en fournit une)."
  export PORT=3000
fi

export HOST="${HOST:-0.0.0.0}"

echo "[railway-start] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-unset} HOST=${HOST}"
echo "[railway-start] RAILWAY_ENVIRONMENT=${RAILWAY_ENVIRONMENT:-unset} RAILWAY_SERVICE_NAME=${RAILWAY_SERVICE_NAME:-unset}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway-start] ERROR: DATABASE_URL is not set."
  echo "[railway-start] Dashboard → service API → Variables →"
  echo "[railway-start]   DATABASE_URL = \${{Postgres.DATABASE_URL}}"
  echo "[railway-start] (référence vers le service Postgres du MÊME projet Railway)"
  exit 1
fi

# Log host:port only (jamais le mot de passe)
DB_HOST=$(printf '%s' "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(printf '%s' "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"
echo "[railway-start] DATABASE_URL host=${DB_HOST:-unknown} port=${DB_PORT}"

case "${DB_HOST}" in
  *supabase.co)
    echo "[railway-start] WARN: host Supabase détecté (${DB_HOST})."
    echo "[railway-start] Le host db.*.supabase.co:5432 est souvent INJOIGNABLE depuis Railway."
    echo "[railway-start] Prefère Postgres Railway: DATABASE_URL=\${{Postgres.DATABASE_URL}}"
    echo "[railway-start] Ou le Session pooler Supabase (port 6543 / aws-*-pooler.supabase.com)."
    ;;
esac

echo "[railway-start] Waiting for Postgres TCP ${DB_HOST}:${DB_PORT} (max 60s)…"
if ! DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" node <<'NODE'
const net = require('net');
const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT || 5432);
const deadline = Date.now() + 60_000;
function tryConnect() {
  const socket = net.connect({ host, port }, () => {
    socket.end();
    console.log('[railway-start] TCP OK ' + host + ':' + port);
    process.exit(0);
  });
  socket.on('error', () => {
    socket.destroy();
    if (Date.now() > deadline) {
      console.error('[railway-start] ERROR: Postgres injoignable à ' + host + ':' + port + ' après 60s.');
      console.error('[railway-start] → Ajoute un service Postgres Railway et lie DATABASE_URL=${{Postgres.DATABASE_URL}}');
      console.error('[railway-start] → Supprime toute URL Supabase hardcodée sur le service API.');
      process.exit(1);
    }
    setTimeout(tryConnect, 2000);
  });
}
tryConnect();
NODE
then
  exit 1
fi

echo "[railway-start] Running prisma migrate deploy..."
if ! sh ./scripts/railway-prisma.sh migrate deploy; then
  echo "[railway-start] ERROR: prisma migrate deploy failed."
  echo "[railway-start] Causes fréquentes: mauvaises credentials, DB vide sans droits, URL pooler mal formée."
  echo "[railway-start] Fix: DATABASE_URL=\${{Postgres.DATABASE_URL}} sur le service API."
  exit 1
fi

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

echo "[railway-start] Starting NestJS → http://${HOST}:${PORT:-3000}/api/health"
exec node dist/main.js
