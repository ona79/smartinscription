# Architecture technique - SmartInscription IA

## 1. Vue d'ensemble
SmartInscription IA est structurée en **monorepo pnpm** regroupant :
- **`apps/web`** : application web et PWA (Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Prisma ORM, Supabase Auth).
- **`services/ia`** : microservice Python (FastAPI) dédié aux futures fonctionnalités d'intelligence artificielle (détection de fraude, prédictions d'affluence, assistant).
- **`packages/shared`** : package interne partagé contenant les constantes métier (frais d'inscription de `25 000 FCFA`, rôles, statuts, moyens de paiement, types de documents) et les types TypeScript associés.

```text
+--------------------+        HTTPS / SSR        +--------------------------+
|   Navigateur / PWA | <-----------------------> |   Next.js (apps/web)     |
|  (Mobile-first)    |                           |  App Router + Middleware |
+--------------------+                           +------------+-------------+
                                                              |
                      +---------------------------------------+---------------------------------------+
                      |                                       |                                       |
                      v                                       v                                       v
           +--------------------+                  +--------------------+                  +--------------------+
           |   Supabase Auth    |                  | PostgreSQL (Prisma)|                  |  Service IA        |
           |  (@supabase/ssr)   |                  |  (Supabase DB)     |                  |  (FastAPI :8000)   |
           +--------------------+                  +--------------------+                  +--------------------+
```

## 2. Décisions d'architecture (Phase 0)

### 2.1 Authentification et contrôle d'accès
- **Supabase Auth (`@supabase/ssr`)** gère les sessions par cookies HTTP, ce qui permet aux Server Components, Server Actions et au Middleware Next.js de lire l'utilisateur authentifié de façon sécurisée.
- **Synchronisation avec Prisma** : lors de l'inscription publique (`/inscription`), un enregistrement `User` est créé dans PostgreSQL avec le même `id` que Supabase Auth et le rôle par défaut `STUDENT`. Les rôles `AGENT` et `ADMIN` ne peuvent être créés que par seed ou par un administrateur.
- **Protection des routes** :
  - `src/middleware.ts` rafraîchit la session et protège `/etudiant/*`, `/agent/*` et `/admin/*`.
  - Les helpers serveur `getCurrentUser()` et `requireRole(...)` assurent une double vérification côté serveur dans les layouts, pages et Server Actions.

### 2.2 Base de données (Prisma + Supabase PostgreSQL)
- Utilisation de `DATABASE_URL` (pooler Supavisor en mode transaction, port `6543`) pour le runtime et `DIRECT_URL` (connexion directe port `5432`) pour les migrations Prisma.
- Le client Prisma généré est instancié en singleton dans `apps/web/src/lib/prisma.ts` pour éviter la saturation de connexions en développement (Hot Reload).

### 2.3 Progressive Web App (PWA)
- Manifest natif Next.js (`src/app/manifest.ts`) configuré en mode `standalone` avec icônes provisoires (`public/icons/`).
- Service Worker géré via `@serwist/next` (`src/app/sw.ts`, compilé vers `public/sw.js` lors du build de production et désactivé en développement pour éviter les effets de cache).

### 2.4 Microservice IA (`services/ia`)
- Isolé dans un service FastAPI conteneurisé (`Dockerfile` + `docker-compose.yml`) pour découpler les dépendances Python/ML de l'application Node.js.
- Expose uniquement `GET /health` en Phase 0.
