// Public configuration source: reads config/site-config.json from the GitHub
// repository. Two fetch paths:
//   - CONFIG_GITHUB_TOKEN set (read-only PAT): GitHub Contents API with
//     `Accept: application/vnd.github.raw` — always fresh, no CDN staleness,
//     so admin-panel saves go live within seconds.
//   - otherwise: raw.githubusercontent.com (CDN, no authentication needed,
//     no token to leak) — up to ~5 min stale.
// Responses are cached in-memory for 15s per serverless instance AND at the
// Vercel edge via s-maxage, so GitHub is never hit on every page view.
//
// Failure policy: any fetch/parse/validation failure falls back to the
// hardcoded defaults, so the public site always renders. The file is
// validated strictly — an invalid file is treated the same as a missing one.
import { defaultSiteConfig, validateSiteConfig, type SiteConfig } from './configSchema.js';

const REPO_OWNER = 'muteebdeva';
const REPO_NAME = 'muteeb-movie';
const REPO_BRANCH = 'main';
const CONFIG_PATH = 'config/site-config.json';

const CACHE_TTL_MS = 15_000;
let cache: { expiresAt: number; config: SiteConfig } | null = null;

function rawUrl(): string {
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${CONFIG_PATH}`;
}

function apiUrl(): string {
  return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_PATH}?ref=${encodeURIComponent(REPO_BRANCH)}`;
}

async function fetchRemote(): Promise<SiteConfig | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const token = process.env.CONFIG_GITHUB_TOKEN;
    const res = token
      ? await fetch(apiUrl(), {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.raw',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'muteeb-movie-site/1.0',
          },
        })
      : await fetch(rawUrl(), {
          signal: controller.signal,
          headers: { 'User-Agent': 'muteeb-movie-site/1.0' },
        });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 256 * 1024) return null;
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
    const errors = validateSiteConfig(data);
    if (errors.length > 0) {
      console.error('[config] remote site-config.json failed validation:', errors.slice(0, 5));
      return null;
    }
    return data as SiteConfig;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Load the effective site config: remote file when valid, else defaults. */
export async function loadSiteConfig(): Promise<{ config: SiteConfig; fromRemote: boolean }> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return { config: cache.config, fromRemote: true };
  const remote = await fetchRemote();
  const config = remote ?? defaultSiteConfig();
  cache = { expiresAt: now + CACHE_TTL_MS, config };
  return { config, fromRemote: remote !== null };
}

/** For tests: bypass the cache. */
export function _resetConfigCache(): void {
  cache = null;
}
