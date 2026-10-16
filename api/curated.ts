// Public curated titles: GET /api/curated?collection=staff_picks
// Reads the collections from config/site-config.json (no database).
// Hidden titles are excluded. Fail-soft: returns [] when unavailable.
import { loadSiteConfig } from './_lib/siteConfigSource.js';
import { ok, methodNotAllowed, handleApiError } from './_lib/respond.js';
import type { Handler } from './_lib/types.js';

const KEY_RE = /^[a-z0-9_]{2,64}$/;

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const raw = req.query.collection;
    const collection = Array.isArray(raw) ? raw[0] : raw;
    if (!collection || !KEY_RE.test(collection)) return ok(res, []);
    const { config } = await loadSiteConfig();
    const coll = config.collections[collection];
    if (!coll || !coll.visible) return ok(res, []);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    ok(res, coll.titles
      .filter((t) => !t.hidden)
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 40)
      .map((t) => ({
        tmdb_id: t.tmdb_id,
        media_type: t.media_type,
        custom_title: t.override_title,
        custom_overview: t.override_overview,
        custom_poster_path: t.override_poster,
        custom_backdrop_path: t.override_backdrop,
        is_featured: t.featured,
      })));
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
