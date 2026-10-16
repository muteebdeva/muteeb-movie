// Public site configuration: enabled providers, visible homepage sections,
// and public-safe settings. Never includes secrets. The SPA calls this on
// load and falls back to built-in defaults on any failure (fail-soft).
import { sb, isDbConfigured, sendDbNotConfigured } from './_lib/supabase.js';
import { ok, methodNotAllowed, handleApiError } from './_lib/respond.js';
import type { Handler } from './_lib/types.js';

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    if (!isDbConfigured()) return sendDbNotConfigured(res);

    const [providers, sections, settings] = await Promise.all([
      sb.get('provider_config', {
        select: 'provider_key,display_name,is_enabled,priority',
        order: 'priority.asc',
      }),
      sb.get('homepage_sections', {
        select: 'section_key,title,source,sort_order,is_visible',
        order: 'sort_order.asc',
      }),
      sb.get('site_settings', { select: 'key,value' }),
    ]);

    const settingsMap: Record<string, unknown> = {};
    for (const s of settings as { key: string; value: unknown }[]) {
      settingsMap[s.key] = s.value;
    }

    ok(res, {
      providers: (providers as unknown[]).filter(
        (p) => (p as { is_enabled: boolean }).is_enabled
      ),
      sections: (sections as unknown[]).filter(
        (s) => (s as { is_visible: boolean }).is_visible
      ),
      branding: settingsMap.branding ?? null,
      announcement: settingsMap.announcement ?? null,
      maintenance: settingsMap.maintenance ?? null,
      player: settingsMap.player ?? null,
    });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
