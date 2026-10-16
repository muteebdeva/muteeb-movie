// /api/admin/titles — curated title management.
// GET    ?collection=&limit=&offset=&tmdb_id=   (paginated list)
// POST   { tmdb_id, media_type, collection_key?, sort_order?, is_featured?,
//          is_hidden?, custom_title?, custom_overview?, custom_poster_path?,
//          custom_backdrop_path? }               (add / upsert)
// PATCH  { id, ...fields }                       (edit)
// DELETE ?id=                                     (remove from curation)
import { sb } from '../_lib/supabase.js';
import { requireAdmin, assertSameOrigin } from '../_lib/auth.js';
import { audit } from '../_lib/audit.js';
import { ok, created, noContent, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import { asRecord, vBool, vInt, vMediaType, vStr, ValidationError } from '../_lib/validate.js';
import type { Handler } from '../_lib/types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function vUuid(v: unknown, name: string): string {
  const s = vStr(v, { required: true, name });
  if (!UUID_RE.test(s as string)) throw new ValidationError(`${name} must be a UUID`);
  return s as string;
}

function pickEditable(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  const collection_key = vStr(body.collection_key, { max: 64, name: 'collection_key' });
  const sort_order = vInt(body.sort_order, { min: 0, max: 100000, name: 'sort_order' });
  const is_featured = vBool(body.is_featured, 'is_featured');
  const is_hidden = vBool(body.is_hidden, 'is_hidden');
  const custom_title = vStr(body.custom_title, { max: 200, name: 'custom_title' });
  const custom_overview = vStr(body.custom_overview, { max: 2000, name: 'custom_overview' });
  const custom_poster_path = vStr(body.custom_poster_path, { max: 300, name: 'custom_poster_path' });
  const custom_backdrop_path = vStr(body.custom_backdrop_path, { max: 300, name: 'custom_backdrop_path' });
  if (collection_key !== null) patch.collection_key = collection_key;
  if (sort_order !== null) patch.sort_order = sort_order;
  if (is_featured !== null) patch.is_featured = is_featured;
  if (is_hidden !== null) patch.is_hidden = is_hidden;
  if (custom_title !== null) patch.custom_title = custom_title;
  if (custom_overview !== null) patch.custom_overview = custom_overview;
  if (custom_poster_path !== null) patch.custom_poster_path = custom_poster_path;
  if (custom_backdrop_path !== null) patch.custom_backdrop_path = custom_backdrop_path;
  // Clearing an override: explicit null clears the column.
  for (const k of ['custom_title', 'custom_overview', 'custom_poster_path', 'custom_backdrop_path'] as const) {
    if (body[k] === null) patch[k] = null;
  }
  patch.updated_at = new Date().toISOString();
  return patch;
}

const handler: Handler = async (req, res) => {
  try {
    const admin = await requireAdmin(req);

    if (req.method === 'GET') {
      const q = req.query;
      const limit = Math.min(Math.max(parseInt(String(q.limit ?? '50'), 10) || 50, 1), 200);
      const offset = Math.max(parseInt(String(q.offset ?? '0'), 10) || 0, 0);
      const params: Record<string, string | number> = {
        order: 'sort_order.asc,created_at.desc',
        limit,
        offset,
      };
      if (q.collection) params.collection_key = `eq.${String(q.collection)}`;
      if (q.tmdb_id) params.tmdb_id = `eq.${parseInt(String(q.tmdb_id), 10) || 0}`;
      const rows = await sb.get('curated_titles', params);
      return ok(res, { titles: rows, limit, offset });
    }

    assertSameOrigin(req);
    const q = (name: string) => {
      const v = req.query[name];
      return Array.isArray(v) ? v[0] : v;
    };

    if (req.method === 'POST') {
      const body = asRecord(req.body);
      const tmdb_id = vInt(body.tmdb_id, { required: true, min: 1, max: 99999999, name: 'tmdb_id' }) as number;
      const media_type = vMediaType(body.media_type);
      if (!media_type) throw new ValidationError('media_type is required');
      const patch = pickEditable(body);
      const rows = await sb.upsert(
        'curated_titles',
        [{ tmdb_id, media_type, added_by: admin.id, ...patch }],
        'tmdb_id,media_type,collection_key'
      );
      const row = (rows as Record<string, unknown>[])[0];
      await audit(admin, 'titles.add', 'curated_titles', String(row.id), { tmdb_id, media_type });
      return created(res, row);
    }

    if (req.method === 'PATCH') {
      const body = asRecord(req.body);
      const id = vUuid(body.id, 'id');
      const patch = pickEditable(body);
      const rows = await sb.update('curated_titles', { id: `eq.${id}` }, patch);
      const row = (rows as Record<string, unknown>[])[0];
      if (!row) return ok(res, { updated: false });
      await audit(admin, 'titles.edit', 'curated_titles', id, patch);
      return ok(res, row);
    }

    if (req.method === 'DELETE') {
      const id = vUuid(q('id'), 'id');
      await sb.del('curated_titles', { id: `eq.${id}` });
      await audit(admin, 'titles.remove', 'curated_titles', id, {});
      return noContent(res);
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
