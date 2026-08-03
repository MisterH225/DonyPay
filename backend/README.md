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

## Ledger adapter

- Contrat : `LedgerPort` (injecter `LEDGER_PORT`)
- Implémentation actuelle : `MockLedgerAdapter` (privée au module)
- Écritures en partie double append-only dans `ledger_entries` (pas d’UPDATE / DELETE)
- Migration : `prisma/migrations/20260803010000_ledger_append_only`

```ts
import { LEDGER_PORT, type LedgerPort } from './modules/ledger-adapter';

constructor(@Inject(LEDGER_PORT) private readonly ledger: LedgerPort) {}
```
