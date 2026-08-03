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

## Ledger & Mobile Money (CinetPay)

Deux implémentations de `LedgerPort` :

| Adaptateur | Rôle |
| --- | --- |
| `MockLedgerAdapter` | Compta append-only locale (défaut `LEDGER_PORT`) |
| `MobileMoneyAdapter` | Collecte async CinetPay sandbox — délègue la compta |

Flux collecte : **initiation → push USSD (sandbox) → webhook HMAC → `recordDeposit`**.

Le webhook exige le header `x-token` (HMAC-SHA256 CinetPay). **Sans signature valide → 401, aucun crédit.**

Endpoints :

- `POST /api/ledger-adapter/mobile-money/collections` — initier une collecte
- `GET  /api/ledger-adapter/mobile-money/collections/:providerRef`
- `POST /api/ledger-adapter/mobile-money/webhook` — notification CinetPay (`x-token`)
- `POST /api/ledger-adapter/mobile-money/sandbox/simulate-callback` — simuler USSD+HMAC (sandbox)

Variables : `CINETPAY_SANDBOX`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY`, `CINETPAY_NOTIFY_BASE_URL`.

## Disputes

- Réclamation liée à un plan d'épargne (`savings_goal`) ou un paiement délégué (`payment_link`)
- Motifs : `non_conforming_product`, `payment_not_received`, `third_party_payer`
- Statuts : `open` → `in_progress` → `resolved` | `rejected`
- Pièces jointes (stockage local via `DISPUTE_ATTACHMENT_STORAGE_PORT`)
- Historique d'échanges (`dispute_messages`)
- Notation 1–5 post-résolution uniquement

Endpoints :

- `POST /api/disputes`
- `GET  /api/disputes/:id`
- `GET  /api/disputes/users/:userId`
- `PATCH /api/disputes/:id/status`
- `POST /api/disputes/:id/messages`
- `POST /api/disputes/:id/attachments`
- `POST /api/disputes/:id/rating`

## Ledger (`ledger_entries`)

- Append-only : triggers anti `UPDATE`/`DELETE` + privilèges SQL
- Rôle applicatif `donypay_app` : `GRANT SELECT, INSERT` uniquement
- `UPDATE`/`DELETE` révoqués pour `donypay_app`, `anon`, `authenticated`, `service_role`, etc.
- Toute correction = écriture compensatoire (nouvelle ligne), jamais une modification
- Migration : `20260803060000_ledger_entries_revoke_update_delete`

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
