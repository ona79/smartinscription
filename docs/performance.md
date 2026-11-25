# Performance & Optimisation de la Navigation

Ce document trace les mesures de performance serveur effectuées en mode production local (`pnpm build && pnpm start`) face à la base Supabase distante (Irlande), avant et après optimisation sur `dev` (incluant les Blocs 0 à 4).

## Mesures AVANT / APRÈS (`pnpm start` — production locale)

> **Avant optimisation** : chaque requête effectuait **3 appels réseau Supabase Auth** (`proxy` + `layout` + `page`) et **2 requêtes `User.findUnique` complètes** (`layout` + `page`), plus des requêtes métier parfois séquentielles ou chargées par `include`.
> **Après optimisation** : **1 seul appel réseau Supabase Auth** par requête (`getCurrentUser` mémoïsé avec `React.cache`, `proxy.ts` via `getSession()` local = 0,2–1,5 ms), **1 seule requête `User.findUnique` légère (`select`)**, requêtes parallélisées (`Promise.all`) et sélectives (`select`), streaming `Suspense`, `loading.tsx`, et imports dynamiques (`next/dynamic`).

| Page | Avant (`pnpm start` total) | Req. Auth / Prisma (Avant → Après) | Après (`pnpm start` TTFB / total) | Cause principale du gain |
| --- | :---: | :---: | :---: | --- |
| `/etudiant` | 836 ms | 3 / 4 → 1 / 3 | **206 ms** / 481 ms | Suppression du doublon Auth+User + streaming `Suspense` des notifications |
| `/etudiant/dossier` | 766 ms | 3 / 3 → 1 / 2 | **210 ms** / 388 ms | `React.cache` sur `getCurrentUser()` et `select` minimal sans `payments` |
| `/etudiant/paiement` | 768 ms | 3 / 3 → 1 / 2 | **208 ms** / 488 ms | `React.cache` sur `getCurrentUser()` + `getStudentPaiementData` ciblé |
| `/etudiant/documents` | 852 ms | 3 / 4 → 1 / 2 | **220 ms** / 486 ms | Fusion des 2 requêtes séquentielles en 1 seule (`getStudentDocumentsData`) |
| `/etudiant/rendez-vous` | 936 ms | 3 / 5 → 1 / 4 | **211 ms** / 756 ms | Parallélisation `Promise.all` des 3 requêtes initialement séquentielles |
| `/agent` | 752 ms | 3 / 4 → 1 / 3 | **210 ms** / 499 ms | Suppression du doublon Auth+User et remplacement des `include` par `select` |
| `/agent/scan` | 486 ms | 3 / 2 → 1 / 1 | **194 ms** / 195 ms | `proxy.ts` local + 1 seul `getCurrentUser()` + scanner via `next/dynamic` |
| `/admin` | 758 ms | 3 / 10 → 1 / 9 | **204 ms** / 479 ms | Suppression du doublon Auth+User et `select` ciblé sur `recentRegistrations` |
| `/admin/dossiers` | 754 ms | 3 / 5 → 1 / 4 | **211 ms** / 474 ms | `React.cache` + `select` ciblé (`aiClass`, `aiScore`, champs affichés uniquement) |
| `/admin/statistiques` | 585 ms | 3 / 6 → 1 / 5 | **210 ms** / 302 ms | `React.cache` + `Suspense` + graphiques Recharts chargés via `next/dynamic` |
| `/admin/alertes-fraude` | 862 ms | 3 / 4 → 1 / 3 | **203 ms** / 471 ms | `React.cache` + `select` minimal sur `FraudAlert` sans jointure `user` |

## Déploiement & Latence réseau (Vercel ↔ Supabase)

1. **Co-localisation Vercel / Supabase** :
   - La base Supabase du projet étant hébergée en **Irlande (`eu-west-1` / Dublin)**, il est recommandé de déployer les fonctions Next.js sur Vercel dans la région **`dub1`** (Dublin), ou **`cdg1`** (Paris) si la base est migrée vers Paris.
   - **Configuration à ajouter dans `vercel.json`** *(non modifié volontairement ici)* :
     ```json
     {
       "regions": ["dub1"]
     }
     ```
2. **Pooler transactionnel Supabase (`DATABASE_URL`)** :
   - En production serverless (Vercel), utiliser le **Transaction Pooler** Supabase sur le port **`6543`** (`?pgbouncer=true`) pour `DATABASE_URL`, et réserver `:5432` à `DIRECT_URL`.
   - L'adaptateur `PrismaPg` dans `apps/web/src/lib/prisma.ts` limite le pool à `max: 5` en développement et `max: 10` en production.
3. **Migration d'index Prisma** :
   - Les index complémentaires ont été préparés dans `apps/web/prisma/migrations/0004_add_perf_indexes/migration.sql` (avec `CREATE INDEX IF NOT EXISTS`, après `0003_bloc0_contracts`, sans dupliquer les index existants et sans l'appliquer automatiquement).
