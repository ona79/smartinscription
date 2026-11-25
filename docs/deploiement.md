# Guide de déploiement — SmartInscription IA

Ce guide décrit le déploiement complet en production sur **Vercel** (Next.js), **Render** (microservice IA FastAPI), **Supabase** (Auth, PostgreSQL, Storage) et **Upstash Redis** (limiteur de débit).

---

## 1. Base de données, Auth & Stockage (Supabase)

1. Créez un projet Supabase (région **Irlande `eu-west-1`** recommandée pour correspondre à la région Vercel `dub1`).
2. Récupérez :
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` : **Transaction Pooler** (port `6543`, `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` : **Direct connection** (port `5432`)
3. Créez deux buckets **privés** (`Public = OFF`) dans **Storage** : `receipts` et `documents`.
4. **Configuration Auth (Supabase Dashboard > Authentication)** :
   - **URL Configuration > Site URL** : `https://<votre-domaine>.vercel.app`
   - **URL Configuration > Redirect URLs** : ajoutez :
     - `https://<votre-domaine>.vercel.app/**`
     - `http://localhost:3000/**` (développement local)
   - **Providers > Email** : désactivez **Confirm email** (`OFF`) si vous souhaitez que l'inscription étudiante connecte immédiatement sans validation d'e-mail en attente (ou configurez un SMTP personnalisé si vous la laissez activée).
5. Appliquez les migrations Prisma :
   ```bash
   pnpm --filter @smartinscription/web exec prisma migrate deploy
   ```

---

## 2. Microservice IA (Render)

1. Connectez le dépôt GitHub sur [render.com](https://render.com) via **New > Blueprint** (détecte `render.yaml`, région **Frankfurt**, contexte Docker `./services/ia`).
2. Le `Dockerfile` entraîne et sauvegarde les modèles ML (`artifacts/*.joblib`) **pendant le build** de l'image pour éviter un démarrage lent.
3. **Variables d'environnement Render** :
   - `PYTHONUNBUFFERED="1"` (déjà dans `render.yaml`)
   - `IA_API_KEY` : chaîne aléatoire d'au moins 32 caractères (identique à Vercel)
4. Vérifiez le health check sur `https://<votre-service>.onrender.com/health`.

---

## 3. Application Web (Vercel)

1. Importez le dépôt sur [vercel.com](https://vercel.com) en conservant le **Root Directory à la racine du monorepo (`.`)** afin que `vercel.json` soit utilisé (région **`dub1`**, build `@smartinscription/shared` puis `@smartinscription/web`, tâche planifiée quotidienne `/api/cron/reminders` à `08:00 UTC`).
2. **Variables d'environnement Vercel (Settings > Environment Variables)** :

| Variable | Rôle | Exemple / Valeur |
| --- | --- | --- |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | URL publique du site | `https://<votre-domaine>.vercel.app` |
| `DATABASE_URL` | Pooler transactionnel Supabase (`6543`) | `postgresql://...?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Connexion directe Supabase (`5432`) | `postgresql://...:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique anon Supabase | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (serveur uniquement) | `eyJ...` |
| `IA_SERVICE_URL` | URL du service Render | `https://<votre-service>.onrender.com` |
| `IA_API_KEY` | Clé partagée avec Render (`X-API-Key`) | *(identique à Render)* |
| `IA_TIMEOUT_MS` | Délai max par appel IA (1 retry auto) | `10000` (défaut) |
| `PAYMENT_PROVIDER` | Fournisseur actif (`mock` ou `paytech`) | `mock` / `paytech` |
| `PAYTECH_API_KEY` / `PAYTECH_API_SECRET` | Clés PayTech Sénégal | *(si `paytech`)* |
| `PAYTECH_ENV` | Environnement PayTech | `test` ou `prod` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Limiteur de débit du scan agent | *(console Upstash)* |
| `CRON_SECRET` | Secret protégeant `/api/cron/reminders` | *(>= 16 caractères)* |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envoi d'e-mails transactionnels | *(console Resend)* |
| `REGISTRATION_CLOSE_DATE` | Date de clôture pour rappels J-7/J-3/J-1 | `2026-12-15` |
| `STORAGE_PROVIDER` | Stockage pièces (`supabase` ou `cloudinary`) | `supabase` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Identifiants Cloudinary (serveur uniquement) | *(si `cloudinary`)* |
| `CARD_QR_SECRET` | Signature HMAC-SHA256 du QR d'identité (≥ 32 octets) | `openssl rand -base64 32` |

---

## 4. Test du Webhook PayTech (IPN) en local avec un tunnel HTTPS

1. Lancez l'application en local (`pnpm dev`, port `3000` ou `3001`).
2. Ouvrez un tunnel HTTPS :
   ```bash
   cloudflared tunnel --url http://localhost:3001
   # ou : ngrok http 3001
   ```
3. Dans `.env`, définissez `APP_URL`, `NEXT_PUBLIC_APP_URL` avec l'URL du tunnel, `PAYMENT_PROVIDER="paytech"` et `PAYTECH_ENV="test"`.
4. Redémarrez `pnpm dev`, effectuez un paiement test et vérifiez que `POST /api/paiement/webhook` passe le paiement à `SUCCESS`.

---

## 5. Checklist avant mise en ligne & surveillance

- **Changer les mots de passe des comptes seed avant ouverture publique** :
  1. Si `seed.ts` a été exécuté avec des mots de passe de développement (`admin@smartinscription.sn`, `agent@smartinscription.sn`, `etudiant@smartinscription.sn`), ouvrez **Supabase Dashboard > Authentication > Users** (ou utilisez l'API Admin `supabase.auth.admin.updateUserById`) et attribuez un mot de passe fort unique à chaque compte, ou supprimez les comptes de test inutiles.
  2. Pour un premier seed en production, exigez `SEED_ALLOW_PROD=true` avec `SEED_ADMIN_PASSWORD`, `SEED_AGENT_PASSWORD` et `SEED_STUDENT_PASSWORD` définis explicitement.
- **Garde-fous** :
  - Ne jamais définir `ENABLE_TEST_ACCOUNTS=true` en production (bloqué par `NODE_ENV=production`).
  - Stocker tous les secrets uniquement dans Vercel / Render (jamais dans Git).
- **Surveillance & maintien en activité** :
  - Configurez un moniteur gratuit (ex. UptimeRobot) effectuant un `GET` toutes les 10 minutes sur :
    - `https://<votre-service>.onrender.com/health` (évite le cold start Render)
    - `https://<votre-domaine>.vercel.app/api/health` (vérifie la base de données et la joignabilité du service IA sans exposer de données sensibles).
