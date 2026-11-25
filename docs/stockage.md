# Architecture de stockage — SmartInscription IA

Ce document décrit l'abstraction `StorageProvider` (`apps/web/src/features/documents/services/storage-provider.ts`) utilisée pour les pièces justificatives et photos d'identité.

---

## 1. Fournisseurs et identifiants opaques

| Usage | Fournisseur | Identifiant stocké en base |
| --- | --- | --- |
| Reçus PDF | Supabase Storage privé (`receipts`) | Chemin Supabase (`<paymentId>.pdf`) |
| Pièces justificatives (défaut) | `SupabaseStorageProvider` (`documents`) | Chemin Supabase (`<userId>/<regId>/<type>-<ts>.<ext>`) |
| Pièces justificatives (optionnel) | `CloudinaryStorageProvider` | `cloudinary:<public_id>` |

La bascule entre `supabase` et `cloudinary` s'effectue sans migration via la variable **`STORAGE_PROVIDER=supabase|cloudinary`** (`supabase` par défaut). Les anciens fichiers restent lisibles grâce à la détection du préfixe `cloudinary:`.

---

## 2. Variables d'environnement

```env
STORAGE_PROVIDER="supabase" # ou "cloudinary"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

> **Sécurité :** `CLOUDINARY_API_SECRET` et `CLOUDINARY_API_KEY` sont utilisés **exclusivement côté serveur**. Aucun préfixe `NEXT_PUBLIC_` ne doit jamais être utilisé pour la clé secrète.

---

## 3. Règles de sécurité Cloudinary

1. **Envoi direct signé (`type: "authenticated"`)** :
   - Aucun upload preset non signé n'est utilisé.
   - La Server Action `prepareDocumentUploadAction` vérifie `requireRole([STUDENT])`, la propriété du dossier, son statut et le limiteur de débit (`checkDocumentUploadRateLimit`), puis signe les paramètres suivants :
     - `folder`: `smartinscription/<registrationId>/<typeDocument>`
     - `type`: `authenticated`
     - `allowed_formats`: `jpg,png,webp` (photo) ou `jpg,png,webp,pdf` (pièces)
2. **Vérification serveur post-envoi (`confirmCloudinaryUploadAction`)** :
   - Le serveur interroge l'API Admin Cloudinary pour vérifier que l'objet existe, appartient au dossier imposé, est bien `authenticated`, respecte les formats autorisés et ne dépasse pas **5 Mo** (**4 Mo** pour les PDF).
3. **Lecture signée à courte durée (5 à 10 min)** :
   - L'endpoint `/api/documents/[documentId]` vérifie que le demandeur est le propriétaire, un `AGENT` ou un `ADMIN`, puis génère une URL signée expirant entre **300 et 600 secondes**.
   - Les photos d'identité utilisent la transformation signée `c_fill,g_face,w_360,h_480,f_auto,q_auto` (recadrage centré sur le visage).
4. **Compression navigateur** :
   - Avant l'envoi, `compressPhotoFile` réduit les photos à ~1,5 Mo via `<canvas>` et supprime les métadonnées EXIF.

---

## 4. Configuration manuelle requise sur Cloudinary

Avant de passer à `STORAGE_PROVIDER="cloudinary"` :
1. Dans **Cloudinary Console > Settings > Security** : cochez **Allow delivery of PDF and ZIP files**.
2. Vérifiez que **Unsigned uploading** est désactivé (ou non utilisé).
3. Renseignez `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET` dans `.env` / Vercel.
