# Build & run the NestJS backend from the monorepo root context.
# Railway: set Dockerfile path to `backend/Dockerfile` (see railway.toml).

FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update -qq \
  && apt-get install -y -qq openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY mobile/package.json ./mobile/

# Install all workspaces deps (incl. build tools: nest CLI, typescript, prisma)
RUN npm ci

COPY backend ./backend

RUN npm run prisma:generate --workspace=backend \
  && npm run build --workspace=backend \
  && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -qq \
  && apt-get install -y -qq openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 --create-home donypay

COPY --from=build --chown=donypay:donypay /app/package.json /app/package-lock.json ./
COPY --from=build --chown=donypay:donypay /app/node_modules ./node_modules
COPY --from=build --chown=donypay:donypay /app/backend ./backend
COPY --from=build --chown=donypay:donypay /app/mobile/package.json ./mobile/package.json

USER donypay
WORKDIR /app/backend
EXPOSE 3000

# Applique les migrations puis démarre l'API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
