#!/bin/sh
set -eu

echo "[railway-start] NODE_ENV=${NODE_ENV:-unset} PORT=${PORT:-unset}"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway-start] ERROR: DATABASE_URL is not set — Nest/Prisma cannot boot."
  exit 1
fi

echo "[railway-start] Running prisma migrate deploy..."
if ! npx prisma migrate deploy; then
  echo "[railway-start] ERROR: prisma migrate deploy failed."
  exit 1
fi

echo "[railway-start] Starting NestJS on 0.0.0.0:${PORT:-3000}"
exec node dist/main.js
