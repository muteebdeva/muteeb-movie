// /api/admin/providers — streaming provider configuration.
// GET   (list ordered by priority; includes timestamps for diagnostics)
// PATCH { provider_key, is_enabled?, priority?, notes? }
// Note: this table holds only non-sensitive flags. Secrets are never stored
// here and the API refuses unknown fields.
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
      const rows = await sb.get('provider_config', { order: 'priority.asc' });
      return ok(res, rows);
    }
    if (req.method !== 'PATCH') return methodNotAllowed(res, ['GET', 'PATCH']);
    assertSameOrigin(req);

    const body = asRecord(req.body);
    const provider_key = vStr(body.provider_key, { required: true, max: 64, name: 'provider_key' }) as string;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: admin.id };
    const is_enabled = vBool(body.is_enabled, 'is_enabled');
    const priority = vInt(body.priority, { min: 0, max: 1000, name: 'priority' });
    const notes = vStr(body.notes, { max: 500, name: 'notes' });
    if (is_enabled !== null) patch.is_enabled = is_enabled;
    if (priority !== null) patch.priority = priority;
    if (notes !== null) patch.notes = notes;
    if (body.notes === null) patch.notes = null;

    const rows = await sb.update('provider_config', { provider_key: `eq.${provider_key}` }, patch);
    const row = (rows as unknown[])[0];
    if (!row) throw new ValidationError(`Unknown provider: ${provider_key}`);
    await audit(admin, 'providers.update', 'provider_config', provider_key, patch);
    ok(res, row);
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
