# KIRI WMS — Supabase Production Setup

## 1. Prepare the Supabase project

This repository is React + Vite, not Next.js. It uses `@supabase/supabase-js`; do not add `@supabase/ssr`, Next.js middleware, `page.tsx`, or `NEXT_PUBLIC_*` variables.

Open Supabase SQL Editor and run:

`supabase/migrations/202609150001_initial_production.sql`

The first user who registers becomes the active `master`. Every next user is created as inactive `viewer` and must be activated by the master.

## 2. Configure authentication

In Authentication → URL Configuration:

- Site URL: your production Vercel URL
- Redirect URLs: add the production URL and localhost URL used for development
- Keep email confirmation enabled for production

## 3. Configure environment variables

Create `.env.local` locally, or add these variables in Vercel Project Settings → Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The older `VITE_SUPABASE_ANON_KEY` is also accepted for legacy Supabase projects. Never put a service-role key in this frontend project.

## 4. Deploy

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Redeploy after changing environment variables.

## 5. Activate another user

Run as a trusted database administrator:

```sql
update public.profiles
set role = 'purchasing', is_active = true, updated_at = now()
where id = '<AUTH_USER_UUID>';
```

Available roles: `master`, `manajer`, `purchasing`, `warehouse`, and `viewer`.

## Current persistence model

The original app stores state in browser localStorage. This migration adds authenticated cloud persistence using one protected JSON snapshot so the current UI can operate without a large rewrite. It is appropriate for a controlled first release. Before high-concurrency use, normalize PR, PO, GRN, item, supplier, and stock-movement data into separate relational tables with transactional RPC functions.
