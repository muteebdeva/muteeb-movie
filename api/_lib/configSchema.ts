// Shared site-configuration schema (mirrored in muteeb-movie-admin).
// The JSON file lives at config/site-config.json in the movie repository.
// Design rules:
// - schema_version lets future changes migrate safely (only v1 is accepted).
// - Titles are referenced by TMDB id + media type; metadata stays in TMDB.
// - NEVER store secrets, API keys, credentials, or tokens in this file.
//   A heuristic scan rejects obvious secret patterns on write.

export const SCHEMA_VERSION = 1;
export const MAX_CONFIG_BYTES = 256 * 1024;

export interface ConfigTitle {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  sort_order: number;
  featured: boolean;
  hidden: boolean;
  override_title: string | null;
  override_overview: string | null;
  override_poster: string | null;
  override_backdrop: string | null;
}

export interface ConfigCollection {
  title: string;
  description: string;
  visible: boolean;
  titles: ConfigTitle[];
}

export interface ConfigSection {
  key: string;
  title: string;
  source: string;
  visible: boolean;
}

export interface ConfigProvider {
  key: string;
  display_name: string;
  enabled: boolean;
  priority: number;
  notes: string;
}

export interface SiteConfig {
  schema_version: number;
  site: {
    name: string;
    tagline: string;
    announcement: { enabled: boolean; text: string };
    maintenance: { enabled: boolean; message: string };
  };
  player: { autoplay: boolean; default_quality: string };
  providers: ConfigProvider[];
  homepage: { sections: ConfigSection[] };
  collections: Record<string, ConfigCollection>;
}

/** TMDB-driven feed sources the movie site knows how to render. */
export const TMDB_SOURCES = [
  'tmdb:trending',
  'tmdb:popular_movies',
  'tmdb:hidden_gems',
  'tmdb:popular_tv',
  'tmdb:indian_cinema',
  'tmdb:anime',
  'tmdb:top_rated_movies',
  'tmdb:top_rated_tv',
  'tmdb:upcoming',
] as const;

const KEY_RE = /^[a-z0-9_]{2,64}$/;
const PROVIDER_KEY_RE = /^[a-z0-9_]{2,32}$/;
// Heuristic: refuse values that look like leaked secrets.
const SECRET_RE = /(ghp_|gho_|github_pat_|sk-live|sk-test|AKIA|xox[bap]-)/i;

export function defaultSiteConfig(): SiteConfig {
  return {
    schema_version: SCHEMA_VERSION,
    site: {
      name: 'Muteeb Movie',
      tagline: 'Discover your next favorite',
      announcement: { enabled: false, text: '' },
      maintenance: { enabled: false, message: "We'll be back soon." },
    },
    player: { autoplay: false, default_quality: 'auto' },
    providers: [{ key: 'vidapi', display_name: 'VidAPI', enabled: true, priority: 0, notes: '' }],
    homepage: {
      sections: [
        { key: 'continue_watching', title: 'Continue Watching', source: 'internal:history', visible: true },
        { key: 'trending', title: 'Trending This Week', source: 'tmdb:trending', visible: true },
        { key: 'popular_movies', title: 'Popular Movies', source: 'tmdb:popular_movies', visible: true },
        { key: 'hidden_gems', title: 'Hidden Gems', source: 'tmdb:hidden_gems', visible: true },
        { key: 'popular_tv', title: 'Popular TV Shows', source: 'tmdb:popular_tv', visible: true },
        { key: 'indian_cinema', title: 'Indian Cinema', source: 'tmdb:indian_cinema', visible: true },
        { key: 'anime', title: 'Anime', source: 'tmdb:anime', visible: true },
        { key: 'top_rated_movies', title: 'Top Rated Movies', source: 'tmdb:top_rated_movies', visible: true },
        { key: 'top_rated_tv', title: 'Top Rated TV Shows', source: 'tmdb:top_rated_tv', visible: true },
        { key: 'upcoming', title: 'Upcoming Movies', source: 'tmdb:upcoming', visible: true },
        { key: 'staff_picks', title: 'Staff Picks', source: 'collection:staff_picks', visible: false },
      ],
    },
    collections: {
      staff_picks: {
        title: 'Staff Picks',
        description: 'Hand-picked by the admin',
        visible: true,
        titles: [],
      },
    },
  };
}

type V = (v: unknown, path: string, errors: string[]) => void;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function str(max: number): V {
  return (v, path, errors) => {
    if (typeof v !== 'string') errors.push(`${path}: expected string`);
    else if (v.length > max) errors.push(`${path}: longer than ${max} chars`);
  };
}

function reqStr(max: number, min = 1): V {
  return (v, path, errors) => {
    if (typeof v !== 'string' || v.length < min) errors.push(`${path}: required string`);
    else if (v.length > max) errors.push(`${path}: longer than ${max} chars`);
  };
}

function bool(): V {
  return (v, path, errors) => {
    if (typeof v !== 'boolean') errors.push(`${path}: expected boolean`);
  };
}

function int(min: number, max: number): V {
  return (v, path, errors) => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
      errors.push(`${path}: expected integer ${min}..${max}`);
  };
}

function checkSecretStrings(v: unknown, path: string, errors: string[]): void {
  if (typeof v === 'string' && SECRET_RE.test(v)) {
    errors.push(`${path}: looks like a secret — secrets must never be stored in site-config.json`);
    return;
  }
  if (Array.isArray(v)) v.forEach((item, i) => checkSecretStrings(item, `${path}[${i}]`, errors));
  else if (isRecord(v))
    for (const [k, item] of Object.entries(v)) checkSecretStrings(item, `${path}.${k}`, errors);
}

/**
 * Strict validation. Returns a list of human-readable errors (empty = valid).
 * Unknown top-level keys are rejected to catch typos; the schema is versioned
 * so v2 can extend it deliberately.
 */
export function validateSiteConfig(data: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(data)) return ['config: expected a JSON object'];
  checkSecretStrings(data, 'config', errors);

  const allowedTop = new Set([
    'schema_version',
    'site',
    'player',
    'providers',
    'homepage',
    'collections',
  ]);
  for (const k of Object.keys(data)) {
    if (!allowedTop.has(k)) errors.push(`config.${k}: unknown key`);
  }

  if (data.schema_version !== SCHEMA_VERSION)
    errors.push(`schema_version: expected ${SCHEMA_VERSION}`);

  // site
  if (!isRecord(data.site)) errors.push('site: expected object');
  else {
    reqStr(60)(data.site.name, 'site.name', errors);
    str(120)(data.site.tagline ?? '', 'site.tagline', errors);
    if (!isRecord(data.site.announcement)) errors.push('site.announcement: expected object');
    else {
      bool()(data.site.announcement.enabled, 'site.announcement.enabled', errors);
      str(300)(data.site.announcement.text ?? '', 'site.announcement.text', errors);
    }
    if (!isRecord(data.site.maintenance)) errors.push('site.maintenance: expected object');
    else {
      bool()(data.site.maintenance.enabled, 'site.maintenance.enabled', errors);
      str(300)(data.site.maintenance.message ?? '', 'site.maintenance.message', errors);
    }
  }

  // player
  if (!isRecord(data.player)) errors.push('player: expected object');
  else {
    bool()(data.player.autoplay, 'player.autoplay', errors);
    const q = data.player.default_quality;
    if (!['auto', '1080p', '720p', '360p'].includes(q as string))
      errors.push('player.default_quality: must be auto, 1080p, 720p, or 360p');
  }

  // providers
  if (!Array.isArray(data.providers)) errors.push('providers: expected array');
  else {
    if (data.providers.length > 20) errors.push('providers: at most 20 entries');
    const keys = new Set<string>();
    data.providers.forEach((p, i) => {
      const path = `providers[${i}]`;
      if (!isRecord(p)) {
        errors.push(`${path}: expected object`);
        return;
      }
      if (typeof p.key !== 'string' || !PROVIDER_KEY_RE.test(p.key))
        errors.push(`${path}.key: must match ${PROVIDER_KEY_RE}`);
      if (keys.has(p.key as string)) errors.push(`${path}.key: duplicate provider key`);
      keys.add(p.key as string);
      reqStr(60)(p.display_name, `${path}.display_name`, errors);
      bool()(p.enabled, `${path}.enabled`, errors);
      int(0, 1000)(p.priority, `${path}.priority`, errors);
      str(500)(p.notes ?? '', `${path}.notes`, errors);
    });
  }

  // homepage.sections
  const collectionKeys = new Set(
    isRecord(data.collections) ? Object.keys(data.collections) : []
  );
  if (!isRecord(data.homepage)) errors.push('homepage: expected object');
  else if (!Array.isArray(data.homepage.sections)) errors.push('homepage.sections: expected array');
  else {
    if (data.homepage.sections.length > 30) errors.push('homepage.sections: at most 30 entries');
    const keys = new Set<string>();
    data.homepage.sections.forEach((s, i) => {
      const path = `homepage.sections[${i}]`;
      if (!isRecord(s)) {
        errors.push(`${path}: expected object`);
        return;
      }
      if (typeof s.key !== 'string' || !KEY_RE.test(s.key))
        errors.push(`${path}.key: must match ${KEY_RE}`);
      if (keys.has(s.key as string)) errors.push(`${path}.key: duplicate section key`);
      keys.add(s.key as string);
      reqStr(80)(s.title, `${path}.title`, errors);
      bool()(s.visible, `${path}.visible`, errors);
      const source = s.source as string;
      const validSource =
        source === 'internal:history' ||
        (TMDB_SOURCES as readonly string[]).includes(source) ||
        (source.startsWith('collection:') &&
          collectionKeys.has(source.slice('collection:'.length)));
      if (!validSource)
        errors.push(
          `${path}.source: unknown source "${source}" (must be internal:history, a tmdb:* feed, or collection:<existing key>)`
        );
    });
  }

  // collections
  if (!isRecord(data.collections)) errors.push('collections: expected object');
  else {
    for (const [ckey, c] of Object.entries(data.collections)) {
      const path = `collections.${ckey}`;
      if (!KEY_RE.test(ckey)) {
        errors.push(`${path}: collection key must match ${KEY_RE}`);
        continue;
      }
      if (!isRecord(c)) {
        errors.push(`${path}: expected object`);
        continue;
      }
      reqStr(80)(c.title, `${path}.title`, errors);
      str(500)(c.description ?? '', `${path}.description`, errors);
      bool()(c.visible, `${path}.visible`, errors);
      if (!Array.isArray(c.titles)) {
        errors.push(`${path}.titles: expected array`);
        continue;
      }
      if (c.titles.length > 100) errors.push(`${path}.titles: at most 100 titles`);
      const seen = new Set<string>();
      c.titles.forEach((t, i) => {
        const tp = `${path}.titles[${i}]`;
        if (!isRecord(t)) {
          errors.push(`${tp}: expected object`);
          return;
        }
        int(1, 99999999)(t.tmdb_id, `${tp}.tmdb_id`, errors);
        if (t.media_type !== 'movie' && t.media_type !== 'tv')
          errors.push(`${tp}.media_type: must be "movie" or "tv"`);
        const dup = `${t.media_type}:${t.tmdb_id}`;
        if (seen.has(dup)) errors.push(`${tp}: duplicate title in collection`);
        seen.add(dup);
        int(0, 100000)(t.sort_order ?? 0, `${tp}.sort_order`, errors);
        bool()(t.featured ?? false, `${tp}.featured`, errors);
        bool()(t.hidden ?? false, `${tp}.hidden`, errors);
        if (t.override_title != null) str(200)(t.override_title, `${tp}.override_title`, errors);
        if (t.override_overview != null) str(2000)(t.override_overview, `${tp}.override_overview`, errors);
        if (t.override_poster != null) str(300)(t.override_poster, `${tp}.override_poster`, errors);
        if (t.override_backdrop != null) str(300)(t.override_backdrop, `${tp}.override_backdrop`, errors);
      });
    }
  }

  return errors;
}
