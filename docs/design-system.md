# Design System — SmartInscription IA

Ce document résume l'échelle visuelle, les tokens CSS et les composants réutilisables de la plateforme.

## 1. Typographie et échelle de densité
- **Police principale** : `Plus Jakarta Sans` chargée via `next/font/google` (`--font-sans`).
- **Texte courant** : `14 px` (`text-sm`) ; **texte secondaire** : `13 px` (`text-[13px]`) ; **libellés de champ** : `13 px` medium.
- **Titre de page** : `24 px` (`text-2xl font-semibold`) ; **sous-titre** : `14 px` atténué (`text-sm text-muted-foreground`).
- **Titre de carte** : `16 px` (`text-base font-semibold`) ; **chiffres des `StatCard`** : `24 px` max (`text-2xl font-semibold`).
- **Icônes** : `16` à `18 px` (`h-4 w-4` ou `h-[18px] w-[18px]`).

## 2. Rayons, hauteurs et espacements
- **Rayons (`--radius: 0.5rem`)** :
  - Cartes : `rounded-xl` (`12 px`)
  - Boutons, champs, sélecteurs et items de navigation : `rounded-lg` (`8 px`)
  - Badges uniquement : `rounded-full`
- **Hauteurs des contrôles** : `40 px` (`h-10`) par défaut pour les boutons et champs ; `36 px` (`h-9`) pour les boutons secondaires, filtres et actions de tableau.
- **Tableaux** : en-têtes `12 px` en majuscules atténuées (`h-9`), lignes de `44 px` (`h-11`), toujours encapsulés dans un conteneur `overflow-x-auto`.
- **Conteneur principal** : `max-w-6xl` centré, padding horizontal `24 px` desktop (`md:px-6`) et `16 px` mobile (`px-4`), padding de carte `p-5` et écart `gap-4`.

## 3. Tokens de couleurs (`apps/web/src/app/globals.css`)

| Token CSS | Classe Tailwind | Rôle |
| --- | --- | --- |
| `--brand` (`#0f766e`) | `bg-brand`, `text-brand` | Couleur primaire (boutons principaux, élément actif) |
| `--brand-dark` (`#064e49`) | `bg-brand-dark` | Variante foncée (survol, panneau de marque) |
| `--background` (`#f8fafc`) | `bg-background` | Fond général des pages |
| `--surface` (`#ffffff`) | `bg-surface` | Fond des cartes, en-têtes et barre latérale |
| `--foreground` (`#0f172a`) | `text-foreground` | Texte principal |
| `--muted-foreground` (`#64748b`) | `text-muted-foreground` | Texte secondaire et descriptions |
| `--border` (`#e2e8f0`) | `border-border` | Bordure `1 px` avec ombre légère (`shadow-xs`) |
| `--success` (`#15803d`) | `text-success`, `bg-success` | États validés et confirmations |
| `--error` / `--destructive` (`#dc2626`) | `text-destructive`, `border-destructive` | Erreurs de validation et alertes |

## 4. Composants réutilisables (`apps/web/src/components/`)

| Composant | Fichier | Usage |
| --- | --- | --- |
| `AuthLayout` | `src/components/auth-layout.tsx` | Écran partagé (panneau de marque SVG à gauche, formulaire compact à droite) |
| `FormField` | `src/components/form-field.tsx` | Champ `40 px` accessible avec label `13 px`, icône, aide et erreur |
| `PageHeader` | `src/components/page-header.tsx` | En-tête de page (`24 px` titre, `14 px` sous-titre, badge et actions) |
| `StatCard` | `src/components/stat-card.tsx` | Carte de métrique compacte (`p-5`, valeur `24 px` max) |
| `EmptyState` | `src/components/empty-state.tsx` | État vide compact avec icône, texte et action |
| `PortalShell` | `src/components/layout/portal-shell.tsx` | Barre latérale `240 px`, en-tête `56 px` (avatar initiales + déconnexion), barre basse mobile |
