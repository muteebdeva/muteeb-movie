// Public site configuration, sourced from config/site-config.json in this
// repository (read via CDN, no authentication). Never includes secrets — the
// JSON file cannot contain them by schema validation. Fail-soft: any problem
// falls back to hardcoded defaults so the site always renders.
import { loadSiteConfig } from './_lib/siteConfigSource.js';
import { ok, methodNotAllowed, handleApiError } from './_lib/respond.js';
import type { Handler } from './_lib/types.js';

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const { config, fromRemote } = await loadSiteConfig();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Config-Source', fromRemote ? 'remote' : 'defaults');
    ok(res, {
      providers: config.providers
        .filter((p) => p.enabled)
        .sort((a, b) => a.priority - b.priority)
        .map((p) => ({ provider_key: p.key, display_name: p.display_name })),
      sections: config.homepage.sections
        .filter((s) => s.visible)
        .map((s) => ({ section_key: s.key, title: s.title, source: s.source })),
      branding: { site_name: config.site.name, tagline: config.site.tagline },
      announcement: config.site.announcement,
      maintenance: config.site.maintenance,
      player: config.player,
      schema_version: config.schema_version,
    });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
