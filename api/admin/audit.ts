// GET /api/admin/audit?limit=&offset=&action= — paginated audit log.
import { sb } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import type { Handler } from '../_lib/types.js';

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await requireAdmin(req);
    const q = (name: string) => {
      const v = req.query[name];
      return Array.isArray(v) ? v[0] : v;
    };
    const limit = Math.min(Math.max(parseInt(q('limit') ?? '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(q('offset') ?? '0', 10) || 0, 0);
    const params: Record<string, string | number> = {
      order: 'created_at.desc',
      limit,
      offset,
    };
    if (q('action')) params.action = `eq.${q('action')}`;
    const rows = await sb.get('audit_log', params);
    ok(res, { entries: rows, limit, offset });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
