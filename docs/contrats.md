# Contrats inter-blocs — SmartInscription IA

Ce document définit les contrats stables entre les blocs de l'équipe afin de travailler en parallèle sans conflits.

> **Règle d'or :** Seul le propriétaire du bloc modifie les fichiers de son dossier (`features/<bloc>/`) ; toute modification du schéma Prisma passe par une PR dédiée.

---

## 1. Nouveaux champs du schéma Prisma (`0003_bloc0_contracts`)

| Modèle | Champ / Table | Type | Détails |
| --- | --- | --- | --- |
| `ActivityLog` | Table complète | `id`, `userId?`, `type` (`LOGIN` \| `CHECK_IN`), `meta` (`Json?`), `createdAt` | Index sur `(type, createdAt)` et `(userId)` |
| `User` | `lastLoginAt` | `DateTime?` | Mis à jour automatiquement lors d'un `LOGIN` |
| `Registration` | `aiClass` | `AiClassification?` (`CONFORME` \| `A_VERIFIER` \| `SUSPECT`) | Classification IA du dossier |
| `Registration` | `aiScore` | `Float?` | Score de risque entre `0.0` et `1.0` |
| `Registration` | `aiAnalyzedAt` | `DateTime?` | Horodatage de la dernière analyse IA |
| `Prediction` | `ufrId` | `String?` | Référence facultative vers `UFR.id` (indexée) |
| `Prediction` | `heure` | `Int?` | Heure cible facultative (`0` à `23`) |
| `Notification` | `NOTIFICATION_TYPES.REMINDER` | Constante partagée (`"REMINDER"`) | Ajoutée dans `@smartinscription/shared` |

---

## 2. Format attendu de la table `Prediction`

| `type` | `dateCible` | `valeur` | `ufrId` | `heure` | Signification |
| --- | --- | --- | --- | --- | --- |
| `AFFLUENCE_JOUR` | Jour cible (UTC) | Nombre de dossiers prévus | Optionnel (`UFR.id`) | `null` | Prévision journalière globale ou par UFR |
| `AFFLUENCE_HEURE` | Jour cible | Nombre d'arrivées prévues | Optionnel (`UFR.id`) | `0` à `23` | Prévision horaire d'affluence |
| `BESOIN_AGENTS` | Jour cible | Nombre d'agents recommandés | Optionnel (`UFR.id`) | Optionnel (`0..23`) | Besoin en personnel calculé |

---

## 3. Signatures des contrats applicatifs

### Activité utilisateur (`apps/web/src/features/activity/record-activity.ts`)
```ts
export async function recordActivity(
  type: "LOGIN" | "CHECK_IN",
  userId: string | null,
  meta?: Record<string, unknown>,
  deps?: { db?: typeof prisma }
): Promise<void>
```
- Capture toute erreur en interne (ne fait jamais échouer l'appelant).
- Appelée dans `loginAction` (`LOGIN` + mise à jour de `User.lastLoginAt`) et lors d'un scan QR réussi (`CHECK_IN` avec `{ registrationId, scannedBy }` dans `meta`).

### Analyse d'anomalies IA (`apps/web/src/features/ia/trigger-anomaly-analysis.ts`)
```ts
export async function triggerAnomalyAnalysis(registrationId: string): Promise<void>
```
- Squelette non bloquant appelé après le succès du webhook de paiement et après un scan QR agent.
- Le propriétaire du bloc IA remplit le corps pour scorer l'inscription et renseigner `aiClass`, `aiScore`, `aiAnalyzedAt` (et créer une `FraudAlert` si besoin).

### Notifications (`apps/web/src/features/notifications/services/notification-service.ts`)
```ts
export interface NotifyUserInput {
  userId: string;
  email: string;
  type: string; // ex. NOTIFICATION_TYPES.REMINDER
  message: string;
  emailSubject: string;
  emailHtml: string;
}

export async function notify(
  input: NotifyUserInput,
  deps?: { db?: typeof prisma; skipEmail?: boolean }
): Promise<void>
```
- Enregistre la `Notification` en base et envoie l'e-mail via `EmailProvider` de façon non bloquante.
