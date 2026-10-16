// /api/admin/sections — homepage section order & visibility.
// GET   (list ordered)
// PATCH { sections: [{ section_key, sort_order?, is_visible?, title? }] }
import { sb } from '../_lib/supabase.js';
import { requireAdmin, assertSameOrigin } from '../_lib/auth.js';
import { audit } from '../_lib/audit.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import { asRecord, vBool, vInt, vStr, ValidationError } from '../_lib/validate.js';
import type { Handler } from '../_lib/types.js';

const handler: Handler = async (req, res) => {
  try {
    const admin = await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await sb.get('homepage_sections', { order: 'sort_order.asc' });
      return ok(res, rows);
    }
    if (req.method !== 'PATCH') return methodNotAllowed(res, ['GET', 'PATCH']);
    assertSameOrigin(req);

    const body = asRecord(req.body);
    const sections = body.sections;
    if (!Array.isArray(sections) || sections.length === 0 || sections.length > 50) {
      throw new ValidationError('sections must be a non-empty array (max 50)');
    }
    const updated: unknown[] = [];
    for (const [i, s] of sections.entries()) {
      const item = asRecord(s);
      const section_key = vStr(item.section_key, { required: true, max: 64, name: `sections[${i}].section_key` }) as string;
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      const sort_order = vInt(item.sort_order, { min: 0, max: 100000, name: `sections[${i}].sort_order` });
      const is_visible = vBool(item.is_visible, `sections[${i}].is_visible`);
      const title = vStr(item.title, { max: 120, name: `sections[${i}].title` });
      if (sort_order !== null) patch.sort_order = sort_order;
      if (is_visible !== null) patch.is_visible = is_visible;
      if (title !== null) patch.title = title;
      const rows = await sb.update('homepage_sections', { section_key: `eq.${section_key}` }, patch);
      if ((rows as unknown[])[0]) updated.push((rows as unknown[])[0]);
    }
    await audit(admin, 'sections.reorder', 'homepage_sections', undefined, {
      count: updated.length,
    });
    ok(res, updated);
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
