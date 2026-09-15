# KIRI WMS — Supabase Production Setup

## 1. Create the Supabase project

Create a Supabase project in the Singapore region when available. Open SQL Editor and run:

`supabase/migrations/202609150001_initial_production.sql`

The first user who registers becomes the active `master`. Every next user is created as inactive `viewer` and must be activated by the master through SQL or a future user-management screen.

## 2. Configure authentication

In Authentication → URL Configuration:

- Site URL: your production Vercel URL
- Redirect URLs: add the production URL and localhost URL used for development
- Keep email confirmation enabled for production

## 3. Configure environment variables

Copy `.env.example` to `.env.local` locally. On Vercel, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never put a Supabase service-role key in this frontend project.

## 4. Deploy

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## 5. Activate another user

Run as a trusted database administrator:

```sql
update public.profiles
set role = 'purchasing', is_active = true, updated_at = now()
where id = '<AUTH_USER_UUID>';
```

Available roles: `master`, `manajer`, `purchasing`, `warehouse`, and `viewer`.

## Current persistence model

The existing app was designed around browser localStorage. This migration adds authenticated cloud persistence using one protected JSON snapshot so the current UI can operate without a large rewrite. It is appropriate as a controlled first production release. Before high-concurrency use, normalize PR, PO, GRN, item, supplier, and stock-movement data into separate relational tables with transactional RPC functions.
