# DôniPay

Application Buy Now Pay Later — **paiement flexible** (marque : blanc + violet `#6D28D9`).

Monorepo :

- `backend/` — NestJS + TypeScript + Prisma (PostgreSQL)
- `mobile/` — React Native (Expo) avec bascule acheteur / vendeur
- `admin/` — Console Next.js ops (KYC, ledger lecture seule, litiges) — **admin only**
- `docker-compose.yml` — Postgres local

## CI / CD

GitHub Actions (`.github/workflows/ci.yml`) sur `push` / PR vers `main` et `staging` :

1. **Backend** — typecheck, ESLint (info), unit, e2e, intégration (Postgres service), build, seed smoke
2. **Admin** — typecheck + build Next.js
3. **Mobile** — `tsc --noEmit`
4. **Deploy staging** (push `main`/`staging` uniquement) — `railway up` si le secret `RAILWAY_TOKEN` est présent

Secrets / variables GitHub à configurer pour le deploy auto :

| Nom | Type | Description |
| --- | --- | --- |
| `RAILWAY_TOKEN` | secret | Token Railway (Account / Project) |
| `RAILWAY_PROJECT_ID` | variable | défaut `90de654d-6836-45a1-b750-c61b52aa29b3` |
| `RAILWAY_SERVICE_ID` | variable | ID du service API (optionnel si un seul service) |
| `RAILWAY_ENVIRONMENT` | variable | `staging` (défaut) |

Sans `RAILWAY_TOKEN`, le job deploy est un no-op (notice) — tu peux aussi activer l’auto-deploy GitHub→Railway dans le dashboard.

## Déploiement Railway

Projet Railway : `90de654d-6836-45a1-b750-c61b52aa29b3`

Config versionnée : `railway.toml` + `backend/Dockerfile` + `backend/scripts/railway-start.sh`.

### Checklist service API (dashboard)

1. **Root Directory** : `/` (racine du monorepo) — pas `backend/`
2. **Builder** : Dockerfile (`backend/Dockerfile`) — pas Nixpacks si le Dockerfile est détecté
3. **Postgres** : ajouter un service Postgres dans le même projet Railway
4. Variables du service API :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (référence Railway, pas une URL Supabase hardcodée) |
| `PORT` | **supprimer** si définie (Railway l’injecte ; jamais `5432`) |
| `HOST` | optionnel (`0.0.0.0` par défaut dans l’image) |
| `SEED_DEMO` | `true` pour peupler le parcours démo au boot |
| `ADMIN_API_KEY` | clé console admin |

5. Healthcheck : `GET /api/health` (déjà dans `railway.toml`, timeout 300s)
6. Déployer → ouvrir les **Deploy Logs** : tu dois voir `Running prisma migrate deploy` puis `Listening on http://0.0.0.0:<PORT>/api`

### Déployer depuis GitHub Actions

1. Crée un token : [railway.com/account/tokens](https://railway.com/account/tokens)
2. GitHub → Settings → Secrets → Actions → `RAILWAY_TOKEN`
3. Variables optionnelles : `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT` (`production` par défaut)
4. Push sur `main` **ou** Actions → CI → Run workflow → `deploy=true`

### Pièges fréquents

- `PORT=5432` → port Postgres, pas Nest → healthcheck KO
- `DATABASE_URL` → `db.xxx.supabase.co:5432` souvent **injoignable** depuis Railway → Postgres Railway ou **Session pooler** Supabase
- CI rouge (`prisma: not found`) → le job Deploy est skip ; corrigé via `npm run prisma:migrate:deploy --workspace=backend`

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
npm run prisma:migrate
npm run db:seed          # données démo (parcours sans Mobile Money)
npm run backend:dev

# Mobile (autre terminal)
cp mobile/.env.example mobile/.env
npm run mobile:start

# Admin (autre terminal, port 3001)
cp admin/.env.example admin/.env
# Aligner ADMIN_API_KEY avec backend/.env
npm run admin:dev
```

## Backend

API NestJS modulaire (préfixe `/api`) :

| Module | Endpoint hello-world |
|---|---|
| identity | `GET /api/identity/hello` — User, KYC, uploads, 2FA, port `KycProviderPort` |
| catalog | `GET /api/catalog/hello` — boutiques, produits, QR, listing |
| savings-engine | `GET /api/savings-engine/hello` — objectifs schedule/flexi, dépôts LedgerPort, notif vendeur |
| payment-links | `GET /api/payment-links/hello` — liens uniques, page publique, callback mobile money |
| ledger-adapter | `GET /api/ledger-adapter/hello` — `LedgerPort` (Mock + MobileMoney/CinetPay) |
| notifications | `GET /api/notifications/hello` — port `NotificationPort`, mock SMS/push |
| disputes | `GET /api/disputes/hello` — réclamations, PJ, historique, notation |
| admin | `GET /api/admin/hello` — console ops (`X-Admin-Key`), KYC / ledger / litiges |

### Console admin (`admin/`)

Next.js sur le port `3001`, **hors mobile**. Auth UI (`ADMIN_PASSWORD`) + appels Nest via `ADMIN_API_KEY` (header `X-Admin-Key`, serveur uniquement).

| Zone | Endpoints |
| --- | --- |
| KYC | `GET /api/admin/kyc/pending`, `POST .../approve`, `POST .../reject` |
| Ledger | `GET /api/admin/ledger/accounts`, `.../:id`, `.../:id/entries` (lecture seule) |
| Litiges | `GET /api/admin/disputes`, `PATCH .../status`, `POST .../messages` |

### Disputes (réclamations)

Réclamation liée à un **plan d'épargne** (`savings_goal`) ou un **paiement délégué** (`payment_link`).

| Motif | Valeur |
| --- | --- |
| Produit non conforme | `non_conforming_product` |
| Paiement non reçu | `payment_not_received` |
| Litige payeur tiers | `third_party_payer` |

Statuts : `open` → `in_progress` → `resolved` | `rejected`.

| Endpoint | Description |
| --- | --- |
| `POST /api/disputes` | Ouvrir une réclamation (+ premier message) |
| `GET /api/disputes/:id` | Détail (messages, PJ, notation) |
| `GET /api/disputes/users/:userId` | Liste des litiges d’un utilisateur |
| `PATCH /api/disputes/:id/status` | Changer le statut |
| `POST /api/disputes/:id/messages` | Ajouter un échange |
| `POST /api/disputes/:id/attachments` | Pièce jointe (`multipart` `file` + `uploadedById`) |
| `POST /api/disputes/:id/rating` | Notation 1–5 post-résolution uniquement |

### Notifications (port découplé)

Événements déclencheurs (canaux SMS + push) :

| Événement | Déclencheur |
| --- | --- |
| `deposit_received` | Versement crédité sur un objectif |
| `goal_reached` | Objectif atteint (vendeur aussi notifié) |
| `installment_due` | Échéance planifiée à venir (rappels) |
| `payment_link_paid_by_third_party` | Lien payé par un tiers (téléphone ≠ propriétaire) |
| `plan_cancelled` | Annulation d’un plan d’épargne (`POST /savings/goals/:id/cancel`) |

- Port : `NotificationPort` (`NOTIFICATION_PORT`)
- Adaptateur actuel : `MockNotificationAdapter` (log console, **privé** au module)
- Provider SMS cible (non branché) : Yellikasms — à brancher via un futur adaptateur

### Tests (Jest)

```bash
npm run backend:test
npm run test:e2e --workspace=backend
# Intégration (Postgres requis — triggers ledger, paiement délégué)
npm run test:integration --workspace=backend
```

### Base de données

- Local : `postgresql://donypay:donypay@localhost:5432/donypay`
- Supabase : `https://rqjaktnwmqzkwldywyjx.supabase.co`

Configurer `DATABASE_URL` dans `backend/.env` (local Docker ou connection string Supabase).

### Seed démo (`npm run db:seed`)

Peuple un parcours **sans Mobile Money / CinetPay** (écritures ledger mock) :

| Email | Rôle |
| --- | --- |
| `admin@donypay.demo` | Admin ops |
| `vendeur@donypay.demo` | Vendeur + boutique + 3 produits |
| `acheteur@donypay.demo` | KYC vérifié — plans active / flexi / ready / completed |
| `kyc-pending@donypay.demo` | KYC en attente (revue admin) |
| `kyc-rejected@donypay.demo` | KYC rejeté |

Inclut aussi un lien de paiement délégué `pending` et un litige `open`. Idempotent (emails `@donypay.demo`).

## Mobile

Navigation Expo avec bascule **Acheteur / Vendeur** (toggle sur les écrans d’accueil).

- Acheteur : Accueil, Paiements
- Vendeur : Accueil, Catalogue

## Structure

```
/
├── .github/workflows/ci.yml
├── backend/
│   ├── prisma/          # migrations + seed.ts
│   ├── src/modules/     # identity, catalog, savings, payment-links, ledger, notifications, disputes, admin
│   └── test/
├── admin/               # console Next.js ops
├── mobile/
├── docker-compose.yml
├── railway.toml
└── package.json
```
