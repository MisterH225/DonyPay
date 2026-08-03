# DonyPay Backend

NestJS + Prisma + PostgreSQL.

Voir le [README racine](../README.md) pour le démarrage du monorepo.

## Scripts

```bash
npm run start:dev
npm run test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
```

## Modules

Chaque module métier expose `GET /api/<module>/hello` :

- identity
- catalog
- savings-engine
- payment-links
- ledger-adapter
- notifications
- disputes

## Payment links

- Lien à usage unique pour une échéance `schedule` (montant figé)
- Expiration configurable (`PAYMENT_LINK_TTL_HOURS`, défaut 48h)
- Page publique sans compte : `GET /api/payment-links/public/:token`
- Callback mobile money → rattache payeur (nom/numéro/opérateur) à l’échéance
  puis `LedgerPort.recordDeposit` via `SavingsGoalsService`

Endpoints :

- `POST /api/payment-links`
- `GET  /api/payment-links/public/:token` (JSON ou HTML)
- `GET  /api/payment-links/public/:token/page`
- `POST /api/payment-links/public/:token/callback`

## Savings engine

- Objectif d’épargne lié à un produit (`targetAmount` = prix produit)
- Modes : `schedule` (échéancier + rappels) / `flexi` (versements libres sur une période)
- Chaque versement appelle `LedgerPort.recordDeposit`
- Objectif atteint → statut `ready_for_withdrawal` + notification vendeur

Endpoints :

- `POST /api/savings-engine/goals`
- `GET  /api/savings-engine/goals/:id`
- `GET  /api/savings-engine/users/:userId/goals`
- `POST /api/savings-engine/goals/:id/deposits`
- `POST /api/savings-engine/reminders/dispatch`

## Catalog

- Boutique : un vendeur (`User`) = une boutique (`shops.seller_id` unique)
- Produit : nom, prix, photo optionnelle, QR code généré automatiquement
- Listing : `GET /api/catalog/shops/:shopId/products`

Endpoints :

- `POST /api/catalog/shops`
- `GET  /api/catalog/shops/:id`
- `GET  /api/catalog/sellers/:sellerId/shop`
- `POST /api/catalog/shops/:shopId/products` (multipart `photo` + champs `name`, `price`)
- `GET  /api/catalog/shops/:shopId/products`
- `GET  /api/catalog/products/:id`

## Identity

- Modèle `User` : `individual` (particulier) ou `company` (entreprise)
- KYC : statut `pending` | `verified` | `rejected`
- Upload pièces : `identity_document` + `proof_of_address`
- 2FA : TOTP ou SMS
- Port prestataire tiers : `KYC_PROVIDER_PORT` / `KycProviderPort` (pas d'implémentation fournie)

```ts
import { KYC_PROVIDER_PORT, type KycProviderPort } from './modules/identity';

// Dans AppModule / IdentityModule :
// { provide: KYC_PROVIDER_PORT, useClass: YourExternalKycAdapter }
```

Endpoints utiles :

- `POST /api/identity/users`
- `POST /api/identity/users/:id/documents/identity|address`
- `GET  /api/identity/users/:id/kyc`
- `POST /api/identity/users/:id/kyc/submit`
- `POST /api/identity/users/:id/2fa/totp/setup|confirm`
- `POST /api/identity/users/:id/2fa/sms/enable|send-code`
- `POST /api/identity/users/:id/2fa/verify`
