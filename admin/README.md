# DonyPay Admin

Console ops Next.js (port `3001`) — **réservée aux administrateurs**.

Fonctions :

- Revue manuelle des KYC en attente
- Consultation ledger en lecture seule
- Gestion des litiges (`disputes`)

## Sécurité

1. Login UI via `ADMIN_PASSWORD` (cookie httpOnly signé)
2. Appels Nest via `X-Admin-Key: ADMIN_API_KEY` **uniquement côté serveur**
3. Middleware bloque toutes les pages hors `/login` sans session
4. Les routes `/api/admin/*` Nest refusent toute requête sans clé

Le mobile et les utilisateurs finaux n’ont pas accès à cette surface.

## Démarrage

```bash
cp admin/.env.example admin/.env
# Aligner ADMIN_API_KEY avec backend/.env

npm run admin:dev
# → http://localhost:3001
```

Backend requis :

```bash
# backend/.env
ADMIN_API_KEY=change-me-admin-key
npm run backend:dev
```
