# Codes QR — SmartInscription IA

La plateforme utilise **deux types de QR codes** distincts, avec des usages et des contrôles d'accès séparés.

## 1. QR code d'identité étudiante (verso de la carte)

- **Emplacement** : verso du composant `StudentCard` (toujours visible, quel que soit l'état du paiement), légende *« Code d'identité »*, agrandissable en plein écran sur fond blanc.
- **Contenu** : `<APP_URL>/verification/carte/<studentId>.<signature>` (identifiant interne opaque, aucune donnée personnelle dans l'URL).
- **Signature** : `HMAC-SHA256` sur `card:v<cardQrVersion>:<studentId>` avec la variable serveur `CARD_QR_SECRET` (32 octets aléatoires minimum, jamais de préfixe `NEXT_PUBLIC_`), encodée en `base64url` et tronquée à 22 caractères. Comparaison en temps constant (`timingSafeEqual`).
- **Rendu** : généré à la volée en SVG (correction d'erreur `M`, zone de silence de 4 modules, noir sur blanc), aucune image stockée.
- **Révocation** : l'action administrateur *« Régénérer le QR de la carte »* incrémente `Student.cardQrVersion`, ce qui invalide immédiatement l'ancien code et notifie l'étudiant.
- **Qui peut le lire** : uniquement les rôles `AGENT` et `ADMIN` sur `/verification/carte/[code]` ou via `/agent/scan`. Un visiteur non connecté est redirigé vers `/connexion` ; un `STUDENT` connecté obtient *« Accès réservé aux agents »* sans fuite de données.
- **Effet de bord** : chaque scan valide enregistre au plus un événement `CHECK_IN` (`ActivityLog`) par fenêtre de 30 minutes pour l'étudiant.

## 2. QR code de reçu de paiement

- **Emplacement** : reçu numérique (`/etudiant/paiement`) et reçu PDF (`/api/recu/[paymentId]/pdf`).
- **Contenu** : `<APP_URL>/verification/<qrToken>` (jeton unique aléatoire généré lors de la confirmation du paiement).
- **Qui peut le lire** : uniquement les rôles `AGENT` et `ADMIN` sur `/verification/[qrToken]` ou via `/agent/scan`.

## 3. Scanner unifié (`/agent/scan`)

Le scanner agent (caméra et saisie manuelle) reconnaît automatiquement les deux formats :
- URL `/verification/carte/...` ou `<id>.<22-chars>` → fiche d'identité complète de la carte ;
- URL `/verification/<qrToken>` ou jeton brut → vérification du paiement du reçu.
