# Audit de complétude — SmartInscription IA

*Audit réalisé en lecture seule sur la branche `dev` (commit `692293d`).*

## 1. Synthèse en 10 lignes

**Taux de complétude global estimé : ~72 %** (socle technique, parcours MVP et outils d'administration solides ; volet IA entraîné sur données synthétiques et automatisations temps réel/cron à compléter).

**5 forces :**
1. Parcours cœur complet de bout en bout : profil étudiant, paiement `25 000 FCFA` fixé côté serveur, webhook idempotent, reçu PDF + QR code cryptographique, scan agent.
2. Sécurité solide : `requireRole` vérifié côté serveur sur toutes les pages et Server Actions protégées, stockage privé Supabase avec URLs signées, `registerAction` forçant `STUDENT`, aucun secret suivi dans Git.
3. Machine à états centralisée (`canTransition`) et tests automatisés passants (`10/10` Vitest, `4/4` Pytest, `pnpm lint`, `pnpm typecheck`, `pnpm build`).
4. Interfaces complètes en français (étudiant, agent, admin) avec design system compact et responsive.
5. Microservice IA FastAPI fonctionnel avec vrais modèles `scikit-learn` (`RandomForestRegressor`, `IsolationForest`, `TfidfVectorizer`).

**5 manques majeurs :**
1. Modèles IA entraînés uniquement sur un jeu de données synthétique (pas d'historique réel multi-années, pas de granularité horaire ni par UFR).
2. Absence de graphiques visuels sur `/admin/statistiques` et d'indicateur de file active temps réel.
3. Notifications limitées à la base + e-mail (`MockEmailProvider` par défaut) : aucun canal SMS ni tâche planifiée de rappel avant clôture.
4. Pas de collecte dédiée de l'heure de connexion ni de l'heure d'arrivée physique au guichet pour alimenter l'IA.
5. Vérification des documents sans OCR automatique et prise de rendez-vous sans gestion multi-guichets.

---

## 2. Tableau principal des fonctionnalités

| # | Fonctionnalité | Statut | Preuves (fichiers, routes, modèles, tests) | Ce qu'il manque précisément |
| --- | --- | --- | --- | --- |
| 1 | Paiement en ligne des 25 000 FCFA | 🟡 Partiel | `apps/web/src/features/paiement/` (`payment-service.ts`, `mock-provider.ts`, `paytech-provider.ts`), `/api/paiement/webhook`, `/etudiant/paiement`, modèle `Payment`, tests `phase1.test.ts` | Tester le webhook IPN PayTech de bout en bout via une URL HTTPS publique (`APP_URL` + tunnel/domaine) |
| 2 | IA de prévision d'affluence (régression) | 🟡 Partiel | `services/ia/app/synthetic_data.py`, `affluence_model.py` (`RandomForestRegressor`), `POST /predict/affluence`, `generateIaPredictionsAction`, `test_ia.py` | Entraînement sur données réelles, ventilation par UFR et par heure, retour d'erreur UI si `services/ia` est hors ligne |
| 3 | Attribution intelligente des créneaux | 🟡 Partiel | `apps/web/src/features/rendez-vous/services/appointment-service.ts` (`generateAvailableSlots`), `/etudiant/rendez-vous`, tests `phase2.test.ts` | Répartition automatique intelligente selon les prévisions IA et gestion de capacité multi-guichets (>1 RDV par créneau) |
| 4 | QR code intelligent | ✅ Complet | `apps/web/src/features/recu/services/receipt-service.ts`, `apps/web/src/features/scan/` (`verification-service.ts`, `qr-scan-client.tsx`), `/agent/scan`, `/verification/[qrToken]`, tests `phase1.test.ts` | Rien de bloquant (l'analyse caméra mobile réelle dépend de l'appareil) |
| 5 | Chatbot / assistant IA | 🟡 Partiel | `services/ia/app/chatbot_faq.py` (`TfidfVectorizer`), `POST /chatbot/faq`, `askFaqChatbotAction`, `faq-chatbot-widget.tsx` | Ajouter le thème **orientation** (aide au choix d'UFR/filière) et un accès optionnel au statut personnel de l'étudiant |
| 6 | Vérification automatique des documents | 🟡 Partiel | `apps/web/src/features/documents/services/document-service.ts`, `/etudiant/documents`, `/agent/dossiers/[registrationId]`, `/api/documents/[documentId]` | Ajouter un contrôle OCR/qualité automatique (actuellement contrôle format/taille + validation manuelle par l'agent) |
| 7 | Tableau de bord administrateur temps réel | 🟡 Partiel | `apps/web/src/features/admin/queries.ts`, `/admin`, `/admin/statistiques`, `/admin/alertes-fraude` | Ajouter des graphiques (courbes/histogrammes), un indicateur « file active » du jour et un rafraîchissement temps réel |
| 8 | Notifications automatiques | 🟡 Partiel | `apps/web/src/features/notifications/` (`notification-service.ts`, `mock-email-provider.ts`, `resend-email-provider.ts`), modèle `Notification`, tests `phase2.test.ts` | Ajouter le canal SMS, configurer `RESEND_API_KEY` en prod, et ajouter un cron de rappel avant clôture |
| 9 | Détection de fraude | 🟡 Partiel | `services/ia/app/anomaly_model.py` (`IsolationForest`), `POST /analyze/dossier`, `runIaAnomalyScanAction`, `/admin/alertes-fraude`, modèle `FraudAlert` | Déclenchement automatique lors du paiement/scan (actuellement déclenché par bouton admin) et règles d'incohérence documentaire |
| 10 | Prédiction des besoins en personnel | 🟡 Partiel | `services/ia/app/affluence_model.py` (`recommended_agents`, capacité 25/jour), `generateIaPredictionsAction` (`BESOIN_AGENTS`) | Modélisation du flux horaire et répartition des besoins en agents par UFR |
| 11 | Classification des dossiers (volet IA) | 🟡 Partiel | `services/ia/app/anomaly_model.py` (`CONFORME` / `A_VERIFIER` / `SUSPECT`), `runIaAnomalyScanAction` | Persister la classe IA sur `Registration` (y compris `CONFORME`) et permettre le filtrage dans l'espace agent/admin |
| 12 | Données collectées pour l'IA | 🟡 Partiel | Horodatages `createdAt` et `paidAt` dans `schema.prisma` (`User`, `Registration`, `Payment`, `Document`, `Appointment`) | Enregistrer les heures de connexion (`User.lastLoginAt` / table d'audit) et l'heure d'arrivée physique au guichet |

### Socle technique vérifié
- **Authentification & 3 rôles (`STUDENT`, `AGENT`, `ADMIN`)** : ✅ Complet (`src/features/auth/`, `src/middleware.ts`, `requireRole` sur toutes les pages/actions protégées, `registerAction` force `STUDENT`).
- **Machine à états `Registration`** : ✅ Complet (`packages/shared/src/state-machine.ts`, testée dans `phase1.test.ts`).
- **Stockage privé & `qrToken`** : ✅ Complet (`receipts` et `documents` privés avec `createSignedUrl`, `qrToken` = 32 octets `base64url`, URL `/verification/<qrToken>` sans donnée personnelle).
- **Seed, PWA, FAQ flottante** : ✅ Complet (`seed.ts`, `manifest.ts` + `sw.ts`, `FaqChatbotWidget`).
- **Qualité & Secrets** : ✅ Aucun secret suivi dans Git (`git grep` propre), `.env.example` complet, `README.md` et `docs/` à jour, `pnpm lint`, `pnpm typecheck`, `pnpm test` (10/10) et `pytest` (4/4) passants.

---

## 3. Écarts de sécurité et de qualité

- **Critique** : aucun écart critique identifié (montant serveur fixe, webhook vérifié + idempotent, double paiement bloqué, `requireRole` présent sur toutes les routes/actions protégées, stockage privé avec URLs signées, `qrToken` cryptographique sans PII).
- **Important** :
  1. Le limiteur de débit du scan agent (`attemptStore` dans `verification-service.ts`) est en mémoire locale : en déploiement serverless multi-instances, il devra être déplacé vers Redis/Supabase.
  2. `generateIaPredictionsAction` et `runIaAnomalyScanAction` échouent silencieusement si `services/ia` (`:8000`) est arrêté, sans message d'erreur affiché à l'administrateur.
  3. L'IPN PayTech (`verifyWebhook` dans `paytech-provider.ts`) n'a pas encore pu être testé en conditions réelles sans URL HTTPS publique (`APP_URL`).
- **Mineur** :
  1. Les identifiants de test dans `unlockTestAccountsAction` (`kassa`) doivent être désactivés ou protégés en production (`NODE_ENV === "production"`).
  2. `middleware.ts` génère un avertissement de dépréciation Next.js 16 (convention `proxy`).

---

## 4. Liste priorisée du reste à faire

1. **Afficher les retours d'erreur/succès des actions IA dans `/admin/statistiques` et `/admin/alertes-fraude`** — *Petite* (dépend de `features/ia/actions.ts`).
2. **Enrichir le chatbot FAQ avec le thème « orientation » (UFR/filières) et le contexte étudiant** — *Petite* (dépend de `services/ia/app/chatbot_faq.py`).
3. **Ajouter des graphiques sur `/admin/statistiques` et l'indicateur « file active » sur `/admin`** — *Moyenne* (dépend de `features/admin/queries.ts`).
4. **Collecter `lastLoginAt` et l'heure d'arrivée guichet (check-in lors du scan QR) pour alimenter les modèles IA** — *Moyenne* (dépend d'une migration Prisma + `verification-service.ts`).
5. **Déclencher l'analyse d'anomalies IA automatiquement lors du webhook paiement et du scan QR** — *Moyenne* (dépend de `payment-service.ts` et `services/ia`).
6. **Ajouter le canal SMS et les rappels planifiés avant clôture des inscriptions** — *Grosse* (dépend d'un fournisseur SMS + cron/Cloud Scheduler).
7. **Tester PayTech IPN de bout en bout sur un environnement HTTPS déployé et passer le rate-limiter sur Redis** — *Moyenne* (dépend du déploiement).

---

## 5. Découpage proposé en 4 blocs indépendants (4 développeurs)

| Développeur | Périmètre | Dossiers & fichiers exclusifs |
| --- | --- | --- |
| **Dev 1 — Paiement & Déploiement** | Tests IPN PayTech HTTPS, déploiement Next.js + FastAPI, rate-limiter distribué | `apps/web/src/features/paiement/`, `apps/web/src/app/api/paiement/`, `docker-compose.yml` |
| **Dev 2 — Admin & DataViz** | Graphiques `/admin/statistiques`, file active temps réel, filtres de classification IA | `apps/web/src/features/admin/`, `apps/web/src/app/admin/` |
| **Dev 3 — IA & Données** | Enrichissement `chatbot_faq.py` (orientation), modèle horaire/UFR, collecte `lastLoginAt` / check-in | `services/ia/`, `apps/web/src/features/ia/` |
| **Dev 4 — Notifications & Créneaux** | Canal SMS, rappels avant clôture (cron), capacité multi-guichets sur les créneaux | `apps/web/src/features/notifications/`, `apps/web/src/features/rendez-vous/` |
