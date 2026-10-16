# Muteeb Movie — Backend Setup (public site)

The public site has two lightweight serverless endpoints (`/api/config`,
`/api/curated`) that read `config/site-config.json` from **this repository**
via the GitHub CDN (`raw.githubusercontent.com`). No database, no tokens,
no environment variables — nothing to configure.

The **admin panel lives in its own repo and deployment**
([muteebdeva/muteeb-movie-admin](https://github.com/muteebdeva/muteeb-movie-admin)).
It edits `config/site-config.json` through the GitHub API (commits to this
repo). That shared JSON file is the link between the two.

## How it works

1. The admin panel saves a change → a commit lands on `main` in this repo.
2. `/api/config` and `/api/curated` fetch the JSON from the GitHub CDN with
   a 60-second cache (per serverless instance + Vercel edge).
3. The site validates the file strictly; anything invalid or unreachable
   falls back to hardcoded defaults, so the site always renders.

## Propagation delay

Expect up to **~5 minutes** between saving in the admin panel and seeing the
change live: the GitHub CDN caches the raw file for ~300s, plus the API's own
60s cache. This is the trade-off for a zero-database, zero-cost setup.

## Optional: skip rebuilds for config-only commits

Every admin save commits to this repo, which would normally trigger a Vercel
rebuild of the site — wasteful, since config is read at request time, not
build time. To skip those rebuilds, set this as the project's
**Ignored Build Step** in Vercel → Settings → Git:

```
git diff --quiet HEAD^ HEAD -- . ':!config/'
```

With it, commits touching only `config/` skip the build; code changes still
build normally. Safe to enable: the site never bakes config into the bundle.

## Files

- `config/site-config.json` — the configuration (schema v1; validated strictly)
- `api/config.ts`, `api/curated.ts` — public read-only endpoints
- `api/_lib/` — config fetcher (CDN + cache), schema validator, responders
- `src/lib/siteConfig.ts` — fail-soft client used by the site

## Editing the JSON by hand

You can edit `config/site-config.json` directly in GitHub's web editor.
Keep `schema_version: 1`, use TMDB ids for titles, and never put secrets in
it — the validator rejects obvious secret patterns.
