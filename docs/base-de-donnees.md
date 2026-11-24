# Base de données - SmartInscription IA

La base de données PostgreSQL (hébergée sur Supabase ou en local via Docker) est gérée avec **Prisma**.
Le schéma se trouve dans `apps/web/prisma/schema.prisma`.

## 1. Modèles principaux

| Modèle | Rôle | Clés / Contraintes notables |
| --- | --- | --- |
| `User` | Utilisateur applicatif lié à Supabase Auth | `id` (UUID identique à Supabase Auth), `email` unique, `role` (`STUDENT`, `AGENT`, `ADMIN`) |
| `Student` | Profil académique de l'étudiant | `userId` unique, `numeroEtudiant` unique, lié à `UFR` et `Filiere` |
| `UFR` | Unité de Formation et de Recherche | `code` unique |
| `Filiere` | Filière rattachée à une UFR | `ufrId` -> `UFR.id` |
| `Registration` | Dossier d'inscription pour une année académique | `studentId`, `academicYear`, `status` (enum `RegistrationStatus`), index sur `(studentId, academicYear)` |
| `Payment` | Paiement des frais d'inscription (défaut `25000` FCFA) | `providerRef` unique, `receiptNumber` unique (`REC-YYYY-000123`), `qrToken` unique, `method` (`ORANGE_MONEY`, `WAVE`, `FREE_MONEY`, `WIZALL`, `CARD`), `status` (`PENDING`, `SUCCESS`, `FAILED`) |
| `Document` | Pièce justificative déposée par l'étudiant | `type` (`ID_CARD`, `TRANSCRIPT`, `DIPLOMA`, `PHOTO`), `verificationStatus`, `rejectionReason` |
| `Appointment` | Rendez-vous physique de validation | `studentId`, `startsAt`, `endsAt`, `status` |
| `Notification` | Notification destinée à un utilisateur | `userId`, `type`, `message`, `read`, `createdAt` |
| `FraudAlert` | Alerte de fraude liée à un paiement ou un dossier | `paymentId` (optionnel), `registrationId` (optionnel), `type`, `score`, `resolved` |
| `Prediction` | Résultat produit par le service IA | `type`, `targetDate`, `value`, `createdAt` |

## 2. Relations clés

```text
User (1) ─── (0..1) Student ─── (N) Registration ─── (N) Payment ─── (N) FraudAlert
  │                    │                 │
  │                    ├── (N) Appointment├── (N) Document
  │                    │                 │
  └── (N) Notification └── UFR / Filiere └── (N) FraudAlert
```

## 3. Commandes Prisma utiles (depuis la racine)
- Générer le client Prisma : `pnpm db:generate`
- Créer / appliquer une migration : `pnpm db:migrate`
- Exécuter le script de seed : `pnpm db:seed`
- Ouvrir Prisma Studio : `pnpm db:studio`

## 4. Données initiales (Seed)
Le script `apps/web/prisma/seed.ts` crée :
- 4 UFR génériques (`UFR-ST`, `UFR-SEG`, `UFR-LSH`, `UFR-SJP`) et des filières associées.
- 3 comptes de test (dans Supabase Auth si `SUPABASE_SERVICE_ROLE_KEY` est configurée, et dans la table `User`) :
  - **Admin** : `admin@smartinscription.sn`
  - **Agent** : `agent@smartinscription.sn`
  - **Étudiant** : `etudiant@smartinscription.sn`
