#!/bin/sh
# Résout le binaire Prisma dans le layout monorepo (hoisté ou local workspace).
set -eu

resolve_prisma() {
  if command -v prisma >/dev/null 2>&1; then
    command -v prisma
    return
  fi
  for candidate in \
    "./node_modules/.bin/prisma" \
    "../node_modules/.bin/prisma" \
    "/app/node_modules/.bin/prisma" \
    "/app/backend/node_modules/.bin/prisma"
  do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return
    fi
  done
  return 1
}

PRISMA_BIN="$(resolve_prisma)" || {
  echo "[railway] ERROR: binaire prisma introuvable."
  echo "[railway] Vérifie que @prisma/client et prisma sont en dependencies du workspace backend."
  exit 1
}

echo "[railway] Using prisma at ${PRISMA_BIN}"
exec "$PRISMA_BIN" "$@"
