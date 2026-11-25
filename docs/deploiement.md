# Guide de déploiement — SmartInscription IA

Ce guide décrit le déploiement complet en production sur **Vercel** (Next.js), **Render** (microservice IA FastAPI), **Supabase** (Auth, PostgreSQL, Storage) et **Upstash Redis** (limiteur de débit).

---

## 1. Base de données & Stockage (Supabase)
1. Créez un projet Supabase et récupérez :
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Transaction Pooler, port `6543`, `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` (Direct connection, port `5432`)
2. Créez deux buckets **privés** (`Public = OFF`) dans **Storage** : `receipts` et `documents`.
3. Appliquez les migrations Prisma :
   ```bash
   pnpm --filter @smartinscription/web exec prisma migrate deploy
   ```

---

## 2. Microservice IA (Render)
1. Connectez le dépôt GitHub sur [render.com](https://render.com) via **New > Blueprint** (détecte automatiquement `render.yaml`).
2. Renseignez la variable secrète `IA_API_KEY` (chaîne aléatoire d'au moins 32 caractères).
3. Vérifiez le health check sur `https://<votre-service>.onrender.com/health`.

---

## 3. Application Web (Vercel)
1. Importez le dépôt sur [vercel.com](https://vercel.com) avec **Root Directory** = `apps/web` (ou monorepo racine avec commande build `pnpm build`).
2. Configurez les variables d'environnement dans **Settings > Environment Variables** :
   - `APP_URL` et `NEXT_PUBLIC_APP_URL` : `https://<votre-domaine>.vercel.app`
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `IA_SERVICE_URL` : `https://<votre-service>.onrender.com`
   - `IA_API_KEY` : même valeur que sur Render
   - `PAYMENT_PROVIDER` : `mock` (test) ou `paytech` (production)
   - `PAYTECH_API_KEY`, `PAYTECH_API_SECRET`, `PAYTECH_ENV` (`test` ou `prod`)
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (base Redis gratuite sur [upstash.com](https://upstash.com))
   - `CRON_SECRET` : secret aléatoire (>= 16 caractères) pour sécuriser `/api/cron/reminders`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `REGISTRATION_CLOSE_DATE` (ex. `2026-12-15`)
3. Le fichier `vercel.json` déclenche automatiquement `GET /api/cron/reminders` chaque jour à `08:00 UTC`.

---

## 4. Test du Webhook PayTech (IPN) en local avec un tunnel HTTPS
PayTech exige une URL HTTPS publique pour `ipn_url`, `success_url` et `cancel_url`.

1. Lancez l'application en local (`pnpm dev`, port `3000` ou `3001`).
2. Ouvrez un tunnel HTTPS :
   ```bash
   cloudflared tunnel --url http://localhost:3001
   # ou : ngrok http 3001
   ```
3. Dans `.env`, définissez :
   ```env
   APP_URL="https://<votre-tunnel>.trycloudflare.com"
   NEXT_PUBLIC_APP_URL="https://<votre-tunnel>.trycloudflare.com"
   PAYMENT_PROVIDER="paytech"
   PAYTECH_ENV="test"
   ```
4. Redémarrez `pnpm dev`, effectuez un paiement test et vérifiez dans les logs que `POST /api/paiement/webhook` reçoit la notification, valide `api_key_sha256` / `api_secret_sha256` et passe le paiement à `SUCCESS`.
   *(Pour le développement quotidien sans tunnel, laissez `PAYMENT_PROVIDER="mock"`.)*

---

## 5. Garde-fous de production & maintien en activité
- **Garde-fous** :
  - Ne jamais exécuter le seed en production avec des mots de passe par défaut (`NODE_ENV=production` bloque `seed.ts` sauf `SEED_ALLOW_PROD=true` avec variables `SEED_*_PASSWORD` explicites).
  - Ne jamais définir `ENABLE_TEST_ACCOUNTS=true` en production (la garde bloque l'affichage et l'action dès que `NODE_ENV=production`).
  - Stocker tous les secrets uniquement dans les variables d'environnement Vercel et Render (jamais dans Git).
- **Éviter la mise en pause (Supabase & Render Free Tier)** :
  - Configurez un moniteur gratuit (ex. UptimeRobot ou GitHub Actions) effectuant un ping `GET` toutes les 10 minutes sur `https://<votre-service>.onrender.com/health` et un ping quotidien sur votre application Vercel.
