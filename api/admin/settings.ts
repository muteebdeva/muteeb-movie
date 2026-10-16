// /api/admin/settings — site settings key/value store.
// GET            (all settings)
// PATCH { key, value }  (key must be a known setting; value shape validated)
import { sb } from '../_lib/supabase.js';
import { requireAdmin, assertSameOrigin } from '../_lib/auth.js';
import { audit } from '../_lib/audit.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import { asRecord, vBool, vStr, ValidationError } from '../_lib/validate.js';
import type { Handler } from '../_lib/types.js';

const KNOWN_KEYS = ['branding', 'maintenance', 'announcement', 'player'] as const;

function validateValue(key: string, value: unknown): Record<string, unknown> {
  const v = asRecord(value);
  switch (key) {
    case 'branding': {
      const site_name = vStr(v.site_name, { max: 60, name: 'site_name' });
      const tagline = vStr(v.tagline, { max: 120, name: 'tagline' });
      return { site_name: site_name ?? 'Muteeb Movie', tagline: tagline ?? '' };
    }
    case 'maintenance': {
      const enabled = vBool(v.enabled, 'enabled') ?? false;
      const message = vStr(v.message, { max: 300, name: 'message' }) ?? '';
      return { enabled, message };
    }
    case 'announcement': {
      const enabled = vBool(v.enabled, 'enabled') ?? false;
      const text = vStr(v.text, { max: 300, name: 'text' }) ?? '';
      return { enabled, text };
    }
    case 'player': {
      const autoplay = vBool(v.autoplay, 'autoplay') ?? false;
      const dq = vStr(v.default_quality, { max: 20, name: 'default_quality' }) ?? 'auto';
      return { autoplay, default_quality: dq };
    }
    default:
      throw new ValidationError(`Unknown setting: ${key}`);
  }
}

const handler: Handler = async (req, res) => {
  try {
    const admin = await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await sb.get('site_settings', { select: 'key,value,updated_at' });
      const map: Record<string, unknown> = {};
      for (const r of rows as { key: string; value: unknown }[]) map[r.key] = r.value;
      return ok(res, map);
    }
    if (req.method !== 'PATCH') return methodNotAllowed(res, ['GET', 'PATCH']);
    assertSameOrigin(req);

    const body = asRecord(req.body);
    const key = vStr(body.key, { required: true, name: 'key' }) as string;
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      throw new ValidationError(`Unknown setting: ${key}`);
    }
    const value = validateValue(key, body.value);
    await sb.upsert(
      'site_settings',
      [{ key, value, updated_by: admin.id, updated_at: new Date().toISOString() }],
      'key'
    );
    await audit(admin, 'settings.update', 'site_settings', key, { value });
    ok(res, { key, value });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
