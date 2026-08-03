# DonyPay

Application Buy Now Pay Later avec scoring utilisateur.

Monorepo :

- `backend/` — NestJS + TypeScript + Prisma (PostgreSQL)
- `mobile/` — React Native (Expo) avec bascule acheteur / vendeur
- `docker-compose.yml` — Postgres local

## Prérequis

- Node.js 20+
- Docker (pour Postgres local)
- npm

## Démarrage rapide

```bash
# Installer les dépendances (workspaces)
npm install

# Lancer Postgres local
npm run db:up

# Backend
cp backend/.env.example backend/.env
npm run prisma:generate
npm run backend:dev

# Mobile (autre terminal)
cp mobile/.env.example mobile/.env
npm run mobile:start
```

## Backend

API NestJS modulaire (préfixe `/api`) :

| Module | Endpoint hello-world |
|---|---|
| identity | `GET /api/identity/hello` — User, KYC, uploads, 2FA, port `KycProviderPort` |
| catalog | `GET /api/catalog/hello` — boutiques, produits, QR, listing |
| savings-engine | `GET /api/savings-engine/hello` — objectifs schedule/flexi, dépôts LedgerPort, notif vendeur |
| payment-links | `GET /api/payment-links/hello` |
| ledger-adapter | `GET /api/ledger-adapter/hello` |
| notifications | `GET /api/notifications/hello` |
| disputes | `GET /api/disputes/hello` |

### Tests (Jest)

```bash
npm run backend:test
npm run test:e2e --workspace=backend
```

### Base de données

- Local : `postgresql://donypay:donypay@localhost:5432/donypay`
- Supabase : `https://rqjaktnwmqzkwldywyjx.supabase.co`

Configurer `DATABASE_URL` dans `backend/.env` (local Docker ou connection string Supabase).

## Mobile

Navigation Expo avec bascule **Acheteur / Vendeur** (toggle sur les écrans d’accueil).

- Acheteur : Accueil, Paiements
- Vendeur : Accueil, Catalogue

## Structure

```
/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── identity/
│   │   │   ├── catalog/
│   │   │   ├── savings-engine/
│   │   │   ├── payment-links/
│   │   │   ├── ledger-adapter/
│   │   │   ├── notifications/
│   │   │   └── disputes/
│   │   └── prisma/
│   └── test/
├── mobile/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── navigation/
│       ├── screens/
│       └── types/
├── docker-compose.yml
└── package.json
```
