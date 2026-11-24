# Design System — SmartInscription IA

Ce document résume les tokens visuels et les composants réutilisables disponibles pour l'équipe.

## 1. Typographie
- **Police principale** : `Plus Jakarta Sans` chargée via `next/font/google` dans `apps/web/src/app/layout.tsx` et mappée sur `--font-sans` dans `apps/web/src/app/globals.css`.

## 2. Tokens de couleurs (`apps/web/src/app/globals.css`)
Les variables CSS sont exposées dans `:root` et mappées dans `@theme inline` pour être utilisables directement via les classes Tailwind :

| Token CSS | Classe Tailwind | Rôle |
| --- | --- | --- |
| `--brand` (`#0f766e`) | `bg-brand`, `text-brand` | Couleur primaire (boutons principaux, liens actifs) |
| `--brand-dark` (`#064e49`) | `bg-brand-dark` | Variante foncée (survol, panneau de marque) |
| `--background` (`#f8fafc`) | `bg-background` | Fond général des pages |
| `--surface` (`#ffffff`) | `bg-surface` | Fond des cartes, en-têtes et barres latérales |
| `--foreground` (`#0f172a`) | `text-foreground` | Texte principal |
| `--muted-foreground` (`#64748b`) | `text-muted-foreground` | Texte secondaire et descriptions |
| `--border` (`#e2e8f0`) | `border-border` | Bordures subtiles (`shadow-none` privilégié) |
| `--success` (`#15803d`) | `text-success`, `bg-success` | États validés et confirmations |
| `--error` / `--destructive` (`#dc2626`) | `text-destructive`, `border-destructive` | Erreurs de validation et alertes |

## 3. Composants réutilisables (`apps/web/src/components/`)

| Composant | Fichier | Usage |
| --- | --- | --- |
| `AuthLayout` | `src/components/auth-layout.tsx` | Écran partagé (panneau de marque SVG à gauche, formulaire aéré à droite) |
| `FormField` | `src/components/form-field.tsx` | Champ accessible avec label lié, icône gauche, action droite, aide et erreur |
| `PageHeader` | `src/components/page-header.tsx` | En-tête de page (titre, description, badge et boutons d'action) |
| `StatCard` | `src/components/stat-card.tsx` | Carte de métrique pour les tableaux de bord |
| `EmptyState` | `src/components/empty-state.tsx` | État vide centré avec icône, texte et bouton d'action |
| `PortalShell` | `src/components/layout/portal-shell.tsx` | Layout des espaces étudiant, agent et admin (sidebar desktop + barre basse mobile) |
| `PlaceholderPage` | `src/components/layout/placeholder-page.tsx` | Page « À implémenter » pour les blocs en attente |

## 4. Règles d'interface
- **Rayons** : `rounded-xl` pour les champs, boutons et items de menu ; `rounded-2xl` pour les cartes et états vides.
- **Mobile-first** : espacements généreux, cibles tactiles d'au moins `44px` (`h-11`), labels toujours liés via `htmlFor`.
