// Public curated titles: GET /api/curated?collection=staff_picks
// Returns non-hidden curated titles for a collection, ordered. Public data —
// no secrets. 503 when the backend isn't configured (the site treats that as
// "no curated titles" and keeps its default shelves).
import { sb, isDbConfigured, sendDbNotConfigured } from './_lib/supabase.js';
import { ok, methodNotAllowed, handleApiError } from './_lib/respond.js';
import type { Handler } from './_lib/types.js';

const KEY_RE = /^[a-z0-9_]{2,64}$/;

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    if (!isDbConfigured()) return sendDbNotConfigured(res);
    const raw = req.query.collection;
    const collection = Array.isArray(raw) ? raw[0] : raw;
    if (!collection || !KEY_RE.test(collection)) {
      return ok(res, []);
    }
    const rows = await sb.get('curated_titles', {
      collection_key: `eq.${collection}`,
      is_hidden: 'eq.false',
      select: 'tmdb_id,media_type,sort_order,custom_title,custom_overview,custom_poster_path,custom_backdrop_path,is_featured',
      order: 'sort_order.asc',
      limit: 40,
    });
    ok(res, rows);
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
