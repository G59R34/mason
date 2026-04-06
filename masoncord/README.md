# Masoncord

A **Discord-style** web app for the Mason ecosystem: same **Supabase Auth** as [mason-web](../mason-web), so signing in on the main site or here uses **one account** (localStorage key `mason_auth`).

## Setup

1. **Database** — In the Supabase SQL editor, run (in order if needed):

   - [`../masoncord_setup.sql`](../masoncord_setup.sql) — creates `masoncord_*` tables, RLS, seed server `#welcome`, `#general`, …, and `masoncord_ensure_main_membership()`.

2. **Realtime** (for live messages) — In Supabase: **Database → Replication**, enable `masoncord_messages`, or run:

   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.masoncord_messages;
   ```

   (If you get “already member”, realtime is already on.)

3. **Env** — Copy `.env.example` to `.env` and use the **same** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as `mason-web`.

4. **Run**

   ```bash
   npm install
   npm run dev
   ```

   Dev server: **http://localhost:5175**

## Main website link

Set `VITE_MAIN_SITE_URL` to your deployed or local mason-web URL. The app shows “Main website” in the top bar and in the channel header.

## mason-web integration

On the main site, set `VITE_MASONCORD_URL` (e.g. `http://localhost:5175`) to show a **Masoncord** link in the footer.

## Stack

- Vite + React + TypeScript
- `@supabase/supabase-js` (auth + Postgres + Realtime)
