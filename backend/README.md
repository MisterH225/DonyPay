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
