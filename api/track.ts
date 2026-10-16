// Public analytics ingestion. Privacy-conscious by design: the client sends a
// random per-visit session id (sessionStorage); we store no IP addresses,
// user agents, or fingerprints — only the event payload. No auth (public
// endpoint); payloads are strictly validated and size-capped.
import { sb, isDbConfigured } from './_lib/supabase.js';
import { ok, methodNotAllowed, handleApiError } from './_lib/respond.js';
import { asRecord, vInt, vMediaType, vOneOf, vStr } from './_lib/validate.js';
import type { Handler } from './_lib/types.js';

const EVENT_TYPES = [
  'page_view',
  'title_open',
  'play_start',
  'play_error',
  'search',
  'api_error',
] as const;

const handler: Handler = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    if (!isDbConfigured()) {
      // Tracking is optional: silently accept when the DB isn't configured
      // so the public site never breaks or spams errors.
      return ok(res, { tracked: false });
    }
    const body = asRecord(req.body);
    const event_type = vOneOf(body.event_type, EVENT_TYPES, 'event_type');
    if (!event_type) return ok(res, { tracked: false });
    const tmdb_id = vInt(body.tmdb_id, { min: 1, max: 99999999, name: 'tmdb_id' });
    const media_type = vMediaType(body.media_type);
    const session_id = vStr(body.session_id, { max: 64, name: 'session_id' });
    let meta: Record<string, unknown> | null = null;
    if (body.meta !== undefined && body.meta !== null) {
      const m = asRecord(body.meta);
      const serialized = JSON.stringify(m);
      if (serialized.length > 2000) return ok(res, { tracked: false });
      meta = m;
    }

    await sb.insert('analytics_events', [
      {
        event_type,
        tmdb_id,
        media_type,
        session_id,
        meta: meta ?? {},
      },
    ]);
    ok(res, { tracked: true });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
