# SmartInscription IA

Plateforme web et mobile (PWA) de paiement et de gestion des inscriptions universitaires au Sénégal (frais de 25 000 FCFA, reçu numérique, QR code, scan par un agent, tableau de bord administrateur et module IA).

> Ce dépôt contient les **fondations techniques (Phase 0)** sur lesquelles l'équipe construit les fonctionnalités métier.

## Prérequis

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Docker & Docker Compose** (pour PostgreSQL local et le service IA FastAPI)
- Un projet **Supabase** (pour l'authentification et la base PostgreSQL distante)

## Installation en 5 étapes

1. **Cloner le dépôt et basculer sur `dev`**
   ```bash
   git clone <url-du-depot>
   cd smartinscription
   git checkout dev
   ```

2. **Installer les dépendances du monorepo**
   ```bash
   pnpm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```
   Renseigner ensuite `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env` (ainsi que `apps/web/.env.local` si besoin).

4. **Lancer les services locaux (optionnel si vous utilisez Supabase Cloud directement)**
   ```bash
   docker compose up -d
   ```

5. **Générer Prisma, appliquer les migrations et injecter les données initiales**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

## Commandes principales

| Commande | Description |
| --- | --- |
| `pnpm dev` | Lance l'application Next.js en mode développement (`http://localhost:3000`) |
| `pnpm build` | Compile `@smartinscription/shared` et `apps/web` pour la production |
| `pnpm lint` | Vérifie le code (ESLint + TypeScript) sur tout le monorepo |
| `pnpm format` | Formate le code avec Prettier |
| `pnpm db:generate` | Génère le client Prisma |
| `pnpm db:migrate` | Exécute les migrations Prisma (`prisma migrate dev`) |
| `pnpm db:seed` | Exécute le script de seed (`apps/web/prisma/seed.ts`) |
| `pnpm db:studio` | Ouvre Prisma Studio |

## Structure du dépôt

```text
smartinscription/
├── apps/
│   └── web/                 # Application Next.js (App Router, Tailwind, shadcn/ui, Prisma, PWA)
├── services/
│   └── ia/                  # Microservice FastAPI (squelette /health)
├── packages/
│   └── shared/              # Constantes et types partagés (rôles, statuts, moyens de paiement)
├── docs/
│   ├── architecture.md      # Architecture technique et décisions
│   ├── base-de-donnees.md   # Modèles Prisma et relations
│   └── conventions.md       # Conventions de code, features/<bloc>, Git & PR
├── docker-compose.yml       # PostgreSQL local + service IA
├── .env.example             # Modèle des variables d'environnement
└── pnpm-workspace.yaml      # Configuration des workspaces pnpm
```

## Documentation équipe

Avant de commencer une fonctionnalité, lire :
- [docs/conventions.md](docs/conventions.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/base-de-donnees.md](docs/base-de-donnees.md)
