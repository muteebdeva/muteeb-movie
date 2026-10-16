# Muteeb Movie — Admin Panel Setup

The admin panel is fully built and merged, but its backend needs a database
before it can do anything. This guide is the ~10 minute setup. Until you
complete it, the public site works exactly as before and the admin panel
shows a "backend not configured" message — nothing breaks.

**Admin URL (after setup):** `https://muteeb-movie.vercel.app/#/admin`

---

## 1. Create the Supabase project (your step)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project (free tier is fine). Pick any name, e.g. `muteeb-movie`.
   Save the database password it generates — you won't need it for the app,
   but keep it somewhere safe.
3. Wait for the project to finish provisioning (~2 minutes).

> Use a random placeholder name if you prefer — never reuse personal details
> for service signups.

## 2. Run the database migration (your step)

1. In the Supabase dashboard, open the **SQL Editor**.
2. Open the file `db/migrations/001_admin_schema.sql` from this repo,
   paste its entire contents into the SQL editor, and run it.
3. You should see "Success". This creates 8 tables, enables Row Level
   Security (deny-all; only the server key can read/write), and seeds
   default collections, homepage sections, the VidAPI provider entry,
   and baseline settings.

## 3. Create your administrator account (your step)

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a strong password. Leave "Auto Confirm User" **on**.
3. Copy the new user's **UUID** (click the user row to see it).
4. In the SQL Editor, run:
   ```sql
   insert into admin_users (id, email, display_name)
   values ('PASTE-UUID-HERE', 'your@email.com', 'Muteeb');
   ```
5. Only emails in `admin_users` can sign in to the panel. There is no public
   registration route — nobody can grant themselves admin.

## 4. Set environment variables on Vercel (your step)

In the Vercel dashboard → your project → **Settings → Environment Variables**,
add these three (Production + Preview + Development). They are **server-only**:
do NOT prefix them with `VITE_` and never put them in client code.

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret key |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Secret |

Then **redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the functions pick
up the new variables.

> The existing `VITE_TMDB_API_KEY` stays as-is for the public site. The admin
> backend never exposes `SUPABASE_SERVICE_ROLE_KEY` to browsers.

## 5. Sign in

Go to `https://muteeb-movie.vercel.app/#/admin` and sign in with the email
and password you created in step 3. Sessions last 12 hours (httpOnly cookie).

---

## What the panel can do

- **Dashboard** — curated title counts, tracked events, traffic chart, most
  played titles, playback/API errors, recent searches, recent admin activity.
- **Titles** — search TMDB, add titles to collections, edit overrides
  (title/description), feature/hide, reorder, remove from curation.
- **Collections** — create/edit/delete curated shelves.
- **Homepage** — reorder shelves, rename them, toggle visibility. The public
  homepage reads this on load (with the previous hardcoded layout as the
  fallback when the backend is unreachable).
- **Providers** — enable/disable streaming providers, set fallback priority.
  Disabling the provider shows a "currently unavailable" notice on the
  public player instead of the embed.
- **Analytics** — honest aggregates from the on-site tracker (page views,
  title opens, play starts, errors, searches, zero-result searches).
- **Audit Log** — every admin action, recorded server-side.
- **Settings** — branding, announcement banner, player defaults, maintenance
  mode (the admin panel itself always stays reachable).

## Honest limitations

- **Analytics start at zero.** There was no tracking before this. Charts fill
  in only from the day the backend is connected — nothing is backfilled or
  estimated.
- **No user accounts on the public site**, so there are no registered-user
  metrics. The panel does not invent a user database.
- **Rate limiting is best-effort**: login attempts are throttled per serverless
  instance (Supabase Auth also throttles upstream). For stronger protection,
  put the site behind Cloudflare (free) and enable its rate limiting.
- **Session secret**: if `SUPABASE_JWT_SECRET` is ever rotated in Supabase,
  update the Vercel env var too — all sessions invalidate on rotation.
- **Analytics table growth**: `analytics_events` grows with traffic. On the
  free tier, periodically delete old rows, e.g.:
  `delete from analytics_events where created_at < now() - interval '90 days';`
- **Admin count**: keep `admin_users` to people you trust completely — every
  admin can change site content and settings.

## Files added

- `db/migrations/001_admin_schema.sql` — schema, RLS, seeds
- `api/_lib/*` — Supabase fetch client, JWT auth, validators, responders, audit
- `api/config.ts`, `api/track.ts`, `api/curated.ts` — public endpoints
- `api/admin/*` — login, logout, me, titles, collections, sections,
  settings, providers, analytics, audit
- `src/pages/admin/*` — login, layout, dashboard, and all management pages
- `src/lib/adminApi.ts`, `src/lib/siteConfig.ts`, `src/lib/tracking.ts`
