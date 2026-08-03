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
COPY admin/package.json ./admin/

# Install all workspaces deps (incl. build tools: nest CLI, typescript, prisma)
RUN npm ci

COPY backend ./backend

# Conserve ts-node pour `prisma db seed` (SEED_DEMO) même en prod slim.
RUN npm run prisma:generate --workspace=backend \
  && npm run build --workspace=backend \
  && npm prune --omit=dev \
  && npm install --no-save --workspace=backend ts-node typescript @types/node

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

RUN chmod +x /app/backend/scripts/railway-start.sh

USER donypay
WORKDIR /app/backend
EXPOSE 3000

# Migrations puis Nest — écoute 0.0.0.0 (voir main.ts)
CMD ["sh", "./scripts/railway-start.sh"]
