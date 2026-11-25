# Documentation IA — SmartInscription IA

Ce document détaille les modèles d'intelligence artificielle implémentés dans `services/ia/` et leur intégration dans `apps/web/`.

---

## 1. Jeux de données synthétiques (`services/ia/app/synthetic_data.py`)
En l'absence d'historique réel multi-années au démarrage du projet, deux jeux de données synthétiques reproductibles (`seed=42`) sont générés :

1. **Affluence universitaire (3 années × 90 jours × 4 UFR × 11 heures = 11 880 points)** :
   - Granularité : année (`2024..2026`), jour de campagne (`0..89`), jour de semaine (`0..6`), heure (`08h..18h`), UFR (`UFR-ST`, `UFR-SEG`, `UFR-LSH`, `UFR-SJP`).
   - Saisonnalité : pic principal de rentrée (`j ≈ 32`), rebond de fin de période (`j ≈ 78`), pics matinaux (`09h–11h`) et lundis matin (`×1,25`), baisse week-end (`×0,18`), pondération par UFR et bruit gaussien (`σ = 0,9`).
2. **Dossiers & paiements normaux (600 échantillons)** :
   - Variables : montant (`25 000 FCFA`), tentatives de paiement (`1–2`), heure de transaction (`08h–20h`), pièces déposées (`0, 2, 4`), heure de connexion (`07h–21h`).

---

## 2. Découpage, modèles et métriques

| Modèle | Algorithme | Persistance | Découpage | Métriques observées |
| --- | --- | --- | --- | --- |
| Prévision d'affluence & personnel | `RandomForestRegressor` (`n_estimators=60`, `max_depth=12`) | `artifacts/affluence_rf.joblib` | 80 % train / 20 % test | **MAE ≈ 0,72** dossiers/h/UFR, **R² ≈ 0,88** |
| Détection d'anomalies | `IsolationForest` (`contamination=0,05`) + règles métier | `artifacts/anomaly_iforest.joblib` | Fit non supervisé + seuils métier | Classification `CONFORME` (<0,40), `A_VERIFIER` (0,40–0,69), `SUSPECT` (≥0,70) |
| Chatbot FAQ | `TfidfVectorizer` + similarité cosinus | Mémoire (5 thèmes) | Seuil de confiance `0,12` | Couvre : inscription, pièces requises, orientation, suivi financier, blocage |

---

## 3. Sécurité & API (`services/ia/main.py`)
- Toutes les routes IA (`/predict/affluence`, `/predict/personnel`, `/analyze/dossier`, `/chatbot/faq`) exigent l'en-tête `X-API-Key` égal à `IA_API_KEY` (désactivé uniquement si `IA_API_KEY` est absent en développement local).
- `/health` reste public pour les contrôles Docker / Render.

---

## 4. Limites assumées
1. **Données synthétiques** : les prévisions reflètent les hypothèses de saisonnalité encodées dans `synthetic_data.py` et devront être ré-entraînées sur les données réelles collectées dans `ActivityLog` et `Registration` après la première campagne.
2. **Chatbot par similarité TF-IDF** : ne génère pas de texte libre (zéro hallucination, coût nul), complété côté serveur par les requêtes Prisma pour les questions personnelles (« mon paiement est-il validé ? »).

---

## 5. Contrat de données réelles (à transmettre à l'université)

Pour entraîner les modèles IA sur les données historiques de l'université sans exposer d'informations personnelles, deux fichiers CSV UTF-8 (séparateur `,`) sont attendus :

### A. Fichier d'affluence agrégée (`affluence.csv`)
> Aucune donnée personnelle. Minimum recommandé : **50 lignes** (au moins 2 semaines d'historique).

| Colonne | Type | Format / Valeurs autorisées | Exemple |
| --- | --- | --- | --- |
| `date` | Date | `AAAA-MM-JJ` | `2025-10-14` |
| `heure` | Entier | `0` à `23` | `10` |
| `ufr` | Texte | Code UFR (`UFR-ST`, `UFR-SEG`, `UFR-LSH`, `UFR-SJP`) | `UFR-ST` |
| `nb_inscriptions` | Entier | `0` à `5000` (sans doublon `(date, heure, ufr)`) | `14` |

### B. Fichier de paiements pseudonymisés (`payments.csv`)
> Aucune colonne d'identité directe (`nom`, `prenom`, `email`, `telephone`, `numero_etudiant`). Minimum recommandé : **30 lignes**.

| Colonne | Type | Format / Valeurs autorisées | Exemple |
| --- | --- | --- | --- |
| `student_hash` | Texte | Empreinte anonyme (générée via `scripts/pseudonymize.py`) | `a8f3c19b04e271d0` |
| `ufr` | Texte | Code UFR | `UFR-SEG` |
| `filiere` | Texte | Nom de la filière | `Finance-Comptabilité` |
| `niveau` | Texte | `L1`, `L2`, `L3`, `M1`, `M2` | `L2` |
| `montant` | Entier | Montant en FCFA (`1` à `1000000`) | `25000` |
| `moyen` | Texte | `WAVE`, `ORANGE_MONEY`, `FREE_MONEY`, `WIZALL`, `CARD` | `WAVE` |
| `horodatage` | Date/Heure | ISO-8601 | `2025-10-14T10:24:00` |
| `statut` | Texte | `PENDING`, `SUCCESS`, `FAILED` | `SUCCESS` |

### C. Procédure d'anonymisation et d'entraînement

```bash
# 1. Pseudonymiser un export brut (supprime nom, prénom, e-mail, téléphone, numéro étudiant)
cd services/ia
PSEUDO_SALT="votre-sel-secret-universite" python scripts/pseudonymize.py \
  --input data/raw_payments.csv \
  --output data/payments.csv

# 2. Entraîner sur données réelles (valide les CSV, entraîne, écrit artifacts/metrics.json)
python train.py --source csv --affluence data/affluence.csv --payments data/payments.csv

# Ou sur données synthétiques (par défaut)
python train.py --source synthetic
```
