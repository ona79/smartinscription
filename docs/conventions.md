# Conventions de développement - SmartInscription IA

Ce document définit les règles de travail pour l'équipe (5 développeurs) afin de garder une base de code homogène, maintenable et sans conflits.

## 1. Langue du projet
- **Code, identifiants, noms de fichiers, commentaires techniques, commits** : en **anglais**.
- **Interface utilisateur (textes, labels, messages d'erreur, notifications)** : en **français**.

## 2. Architecture des fonctionnalités (`features/<bloc>`)
Dans `apps/web/src/`, les fonctionnalités métier doivent être organisées par domaine dans `src/features/<bloc>/` plutôt que d'éparpiller les fichiers :

```text
apps/web/src/
├── app/                      # Routes Next.js App Router (pages, layouts, route handlers)
├── components/
│   ├── ui/                   # Composants shadcn/ui (ne pas modifier à la main sauf besoin)
│   ├── layout/               # Composants de navigation et shells (étudiant, agent, admin)
│   └── pwa/                  # Enregistrement du service worker et utilitaires PWA
├── features/
│   ├── auth/                 # Connexion, inscription, helpers session
│   ├── registration/         # Dossier d'inscription étudiant
│   ├── payment/              # Paiement 25 000 FCFA, reçu numérique, QR token
│   ├── documents/            # Téléversement et vérification des pièces justificatives
│   ├── appointments/         # Prise de rendez-vous et créneaux
│   ├── qr-scan/              # Scan QR par l'agent et validation sur place
│   ├── notifications/        # Notifications in-app / email / SMS
│   └── admin-analytics/      # Statistiques, alertes fraude et prédictions IA
├── lib/
│   ├── prisma.ts             # Client Prisma singleton
│   ├── supabase/             # Clients Supabase (browser, server, middleware, admin)
│   └── utils.ts              # Utilitaires génériques (cn, formatters)
└── middleware.ts             # Protection des routes et rafraîchissement de session
```

Chaque dossier `features/<bloc>/` peut contenir :
- `components/` : composants React spécifiques au bloc
- `actions.ts` : Server Actions Next.js (`"use server"`)
- `queries.ts` : requêtes serveur Prisma / Supabase
- `schemas.ts` : schémas de validation Zod
- `types.ts` : types locaux au bloc (les types globaux vont dans `packages/shared`)

## 3. Nommage
- **Composants React** : `PascalCase.tsx` (ex. `PaymentCard.tsx`).
- **Hooks** : `useCamelCase.ts` (ex. `useRegistrationStatus.ts`).
- **Fichiers utilitaires / actions / schémas** : `kebab-case.ts` ou nom standard (`actions.ts`, `queries.ts`, `schemas.ts`).
- **Routes URL** : en français et `kebab-case` (ex. `/etudiant/rendez-vous`, `/admin/alertes-fraude`).
- **Variables d'environnement** : `UPPER_SNAKE_CASE` (aucun secret en dur dans le code).

## 4. Git : branches, commits et Pull Requests
### Branches
- `main` : branche de production (stable, protégée).
- `dev` : branche d'intégration de l'équipe.
- Branches de travail : créées depuis `dev` avec le préfixe adapté :
  - `feat/<bloc>-<description-courte>` (ex. `feat/payment-wave-integration`)
  - `fix/<description-courte>` (ex. `fix/auth-redirect-loop`)
  - `docs/<description-courte>`
  - `chore/<description-courte>`

### Commits (Conventional Commits)
Format : `<type>(<scope>): <description en anglais>`
Exemples :
- `feat(payment): add Wave checkout initiation endpoint`
- `fix(auth): redirect agent to /agent after login`
- `docs(readme): update local setup steps`

### Pull Requests
- **Une PR par fonctionnalité vers `dev`** (pas de push direct sur `main` ou `dev`).
- Avant d'ouvrir une PR, exécuter impérativement :
  ```bash
  pnpm lint
  pnpm build
  ```
- Au moins **1 relecture** par un autre membre du groupe avant merge.
