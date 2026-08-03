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
