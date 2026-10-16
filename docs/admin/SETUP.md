# Muteeb Movie — Backend Setup (public site)

The public site has three lightweight serverless endpoints (`/api/config`,
`/api/track`, `/api/curated`) that read from a shared Supabase Postgres
database. The **admin panel lives in its own repo and deployment**
([muteebdeva/muteeb-movie-admin](https://github.com/muteebdeva/muteeb-movie-admin))
and writes to that same database — that shared database is the link between
the two.

Until the steps below are done, the site works exactly as before: the
endpoints return "not configured" and every integration falls back to
built-in defaults. Nothing breaks.

## 1. Create the Supabase project (your step)

1. [supabase.com](https://supabase.com) → free account → new project
   (free tier is fine), e.g. `muteeb-movie`.
2. Supabase dashboard → **SQL Editor** → paste the entire contents of
   `db/migrations/001_admin_schema.sql` → run. This creates the 8 tables
   with deny-all Row Level Security plus seed data.

## 2. Set environment variables on Vercel (your step)

Vercel dashboard → this project → **Settings → Environment Variables**
(Production + Preview). Server-only — no `VITE_` prefix:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret |

Then **redeploy** so the functions pick them up.

## 3. What lights up

- `/api/config` — homepage sections, enabled providers, branding,
  announcement banner, maintenance mode (all managed in the admin panel)
- `/api/track` — privacy-conscious event ingestion (page views, plays,
  errors, searches; no IP/UA/fingerprinting)
- `/api/curated` — curated collections (e.g. Staff Picks) for the homepage

The admin panel repo's `docs/admin/SETUP.md` covers creating your admin
account and deploying the panel itself.

## Files

- `api/config.ts`, `api/track.ts`, `api/curated.ts` — public endpoints
- `api/_lib/` — Supabase fetch client, validators, responders (no dependencies)
- `db/migrations/001_admin_schema.sql` — shared schema (same file as the admin repo)
- `src/lib/siteConfig.ts`, `src/lib/tracking.ts` — fail-soft client integration
