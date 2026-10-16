// /api/admin/collections — curated collection CRUD.
// GET    (list ordered)
// POST   { key, title, description?, sort_order?, is_visible? }
// PATCH  { key, title?, description?, sort_order?, is_visible? }
// DELETE ?key=  (refused when curated titles still reference the collection)
import { sb } from '../_lib/supabase.js';
import { requireAdmin, assertSameOrigin } from '../_lib/auth.js';
import { audit } from '../_lib/audit.js';
import { ok, created, noContent, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import { asRecord, vBool, vInt, vStr, ValidationError } from '../_lib/validate.js';
import type { Handler } from '../_lib/types.js';

const KEY_RE = /^[a-z0-9_]{2,64}$/;

function vKey(v: unknown): string {
  const s = vStr(v, { required: true, max: 64, name: 'key' }) as string;
  if (!KEY_RE.test(s)) throw new ValidationError('key must be 2-64 chars: a-z, 0-9, _');
  return s;
}

const handler: Handler = async (req, res) => {
  try {
    const admin = await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await sb.get('collections', { order: 'sort_order.asc' });
      return ok(res, rows);
    }

    assertSameOrigin(req);
    const q = (name: string) => {
      const v = req.query[name];
      return Array.isArray(v) ? v[0] : v;
    };

    if (req.method === 'POST') {
      const body = asRecord(req.body);
      const key = vKey(body.key);
      const title = vStr(body.title, { required: true, max: 120, name: 'title' }) as string;
      const description = vStr(body.description, { max: 500, name: 'description' });
      const sort_order = vInt(body.sort_order, { min: 0, max: 100000, name: 'sort_order' }) ?? 0;
      const is_visible = vBool(body.is_visible, 'is_visible') ?? true;
      const rows = await sb.upsert('collections', [{ key, title, description, sort_order, is_visible }], 'key');
      const row = (rows as Record<string, unknown>[])[0];
      await audit(admin, 'collections.add', 'collections', key, { title });
      return created(res, row);
    }

    if (req.method === 'PATCH') {
      const body = asRecord(req.body);
      const key = vKey(body.key);
      const patch: Record<string, unknown> = {};
      const title = vStr(body.title, { max: 120, name: 'title' });
      const description = vStr(body.description, { max: 500, name: 'description' });
      const sort_order = vInt(body.sort_order, { min: 0, max: 100000, name: 'sort_order' });
      const is_visible = vBool(body.is_visible, 'is_visible');
      if (title !== null) patch.title = title;
      if (description !== null) patch.description = description;
      if (body.description === null) patch.description = null;
      if (sort_order !== null) patch.sort_order = sort_order;
      if (is_visible !== null) patch.is_visible = is_visible;
      const rows = await sb.update('collections', { key: `eq.${key}` }, patch);
      const row = (rows as Record<string, unknown>[])[0];
      await audit(admin, 'collections.edit', 'collections', key, patch);
      return ok(res, row ?? { updated: false });
    }

    if (req.method === 'DELETE') {
      const key = vKey(q('key'));
      const refs = await sb.get('curated_titles', {
        collection_key: `eq.${key}`,
        select: 'id',
        limit: 1,
      });
      if ((refs as unknown[]).length > 0) {
        throw new ValidationError(
          'Collection still contains curated titles. Remove or move them first.'
        );
      }
      await sb.del('collections', { key: `eq.${key}` });
      await audit(admin, 'collections.remove', 'collections', key, {});
      return noContent(res);
    }

    return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
