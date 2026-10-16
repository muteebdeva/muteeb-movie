-- Muteeb Movie — Admin panel schema (001)
-- Run this in the Supabase SQL editor (or via psql) on a fresh project.
-- All tables are owned by the service_role key used by /api functions.
-- Row Level Security is enabled with deny-all policies: only the
-- service_role key (server-side, never exposed to browsers) can read/write.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Admin allowlist. A user must (a) exist in Supabase Auth and (b) have a row
-- here. Bootstrap: sign up in the Auth dashboard, then insert your user id.
-- ---------------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Curated titles. TMDB remains the source of truth for metadata; this table
-- stores OUR curation: which titles are featured/hidden, collection
-- membership, ordering, and optional display overrides.
-- ---------------------------------------------------------------------------
create table if not exists curated_titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  collection_key text not null default 'custom',
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_hidden boolean not null default false,
  -- Optional display overrides (null = use TMDB metadata as-is)
  custom_title text,
  custom_overview text,
  custom_poster_path text,
  custom_backdrop_path text,
  added_by uuid references admin_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tmdb_id, media_type, collection_key)
);
create index if not exists curated_titles_collection_idx
  on curated_titles (collection_key, sort_order);

-- ---------------------------------------------------------------------------
-- Named collections (curated shelves). Built-ins are seeded below.
-- ---------------------------------------------------------------------------
create table if not exists collections (
  key text primary key,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Homepage sections: which shelves render on the public homepage and in what
-- order. `source` is either a TMDB-driven feed (existing site behaviour) or
-- a curated collection key.
-- ---------------------------------------------------------------------------
create table if not exists homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null,
  source text not null, -- e.g. 'tmdb:trending' | 'collection:staff_picks'
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Site settings (branding, behaviour flags). Values are JSON.
-- ---------------------------------------------------------------------------
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users (id)
);

-- ---------------------------------------------------------------------------
-- Streaming providers. The public player only uses providers with
-- is_enabled = true, in priority order (lower number = tried first).
-- Secrets NEVER go here — only non-sensitive display/config flags.
-- ---------------------------------------------------------------------------
create table if not exists provider_config (
  provider_key text primary key,
  display_name text not null,
  is_enabled boolean not null default true,
  priority integer not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users (id)
);

-- ---------------------------------------------------------------------------
-- Analytics events. Privacy-conscious by design: no IP addresses, no user
-- agents, no fingerprints — only a random per-visit session id generated
-- in the browser (sessionStorage) and the event payload itself.
-- ---------------------------------------------------------------------------
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- page_view|title_open|play_start|play_error|search|api_error
  tmdb_id integer,
  media_type text,
  session_id text,
  meta jsonb,               -- e.g. {"query": "...", "zero_results": true}
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_type_time_idx
  on analytics_events (event_type, created_at desc);
create index if not exists analytics_events_title_idx
  on analytics_events (tmdb_id, media_type);

-- ---------------------------------------------------------------------------
-- Audit log: every mutating admin action is recorded here by the API.
-- Append-only from the application's perspective.
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admin_users (id),
  admin_email text,
  action text not null,       -- e.g. 'titles.add'
  entity text,                -- e.g. 'curated_titles'
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_time_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: deny everything to anon/authenticated roles. The API uses the
-- service_role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table admin_users      enable row level security;
alter table curated_titles   enable row level security;
alter table collections      enable row level security;
alter table homepage_sections enable row level security;
alter table site_settings    enable row level security;
alter table provider_config  enable row level security;
alter table analytics_events enable row level security;
alter table audit_log        enable row level security;

-- ---------------------------------------------------------------------------
-- Seeds: default collections, homepage sections (mirroring the site's
-- current hardcoded rows), the VidAPI provider, and baseline settings.
-- ---------------------------------------------------------------------------
insert into collections (key, title, description, sort_order, is_visible) values
  ('staff_picks',   'Staff Picks',   'Hand-picked titles curated by the admin', 0, true),
  ('custom',        'Custom',        'General curated titles',                  1, true)
on conflict (key) do nothing;

insert into homepage_sections (section_key, title, source, sort_order, is_visible) values
  ('continue_watching', 'Continue Watching', 'internal:history',      0, true),
  ('trending',          'Trending This Week', 'tmdb:trending',         1, true),
  ('popular_movies',    'Popular Movies',    'tmdb:popular_movies',   2, true),
  ('hidden_gems',       'Hidden Gems',       'tmdb:hidden_gems',      3, true),
  ('popular_tv',        'Popular TV Shows',  'tmdb:popular_tv',       4, true),
  ('indian_cinema',     'Indian Cinema',     'tmdb:indian_cinema',    5, true),
  ('anime',             'Anime',             'tmdb:anime',            6, true),
  ('top_rated_movies',  'Top Rated Movies',  'tmdb:top_rated_movies', 7, true),
  ('top_rated_tv',      'Top Rated TV Shows','tmdb:top_rated_tv',     8, true),
  ('upcoming',          'Upcoming Movies',   'tmdb:upcoming',         9, true),
  ('staff_picks',       'Staff Picks',       'collection:staff_picks',10, false)
on conflict (section_key) do nothing;

insert into provider_config (provider_key, display_name, is_enabled, priority, notes) values
  ('vidapi', 'VidAPI', true, 0, 'Primary embed provider (iframe)')
on conflict (provider_key) do nothing;

insert into site_settings (key, value) values
  ('branding',        '{"site_name": "Muteeb Movie", "tagline": "Your cinematic universe"}'),
  ('maintenance',     '{"enabled": false, "message": "We will be back shortly."}'),
  ('announcement',    '{"enabled": false, "text": ""}'),
  ('player',          '{"autoplay": false, "default_quality": "auto"}')
on conflict (key) do nothing;
