// Public site configuration, served by /api/config when the admin backend
// is configured. Fail-soft by design: any failure (network, 503, timeout)
// resolves to null and the site falls back to its built-in defaults, so the
// public experience never depends on the database being set up.
export interface SiteConfig {
  providers: { provider_key: string; display_name: string }[];
  sections: { section_key: string; title: string; source: string }[];
  branding: { site_name?: string; tagline?: string } | null;
  announcement: { enabled?: boolean; text?: string } | null;
  maintenance: { enabled?: boolean; message?: string } | null;
  player: { autoplay?: boolean; default_quality?: string } | null;
}

let cache: Promise<SiteConfig | null> | null = null;

export function getSiteConfig(): Promise<SiteConfig | null> {
  if (!cache) {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    const fetchConfig = fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && d.ok ? (d.data as SiteConfig) : null))
      .catch(() => null);
    cache = Promise.race([fetchConfig, timeout]);
  }
  return cache;
}

/** True unless the backend explicitly reports this provider as disabled. */
export async function isProviderEnabled(providerKey: string): Promise<boolean> {
  const cfg = await getSiteConfig();
  if (!cfg) return true; // fail-open: backend not configured → current behaviour
  return cfg.providers.some((p) => p.provider_key === providerKey);
}
