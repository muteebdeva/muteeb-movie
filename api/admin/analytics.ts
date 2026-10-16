// GET /api/admin/analytics?days=30 — honest aggregates over analytics_events.
// Everything here is measured from the events table; when there is no data
// the response contains empty arrays, never fabricated numbers.
import { sb, sbCount } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/auth.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import type { Handler } from '../_lib/types.js';

interface Ev {
  event_type: string;
  tmdb_id: number | null;
  media_type: string | null;
  session_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface AnalyticsSummary {
  window_days: number;
  measured_from: string | null;
  curated: { movies: number; tv: number; note: string };
  totals: { events: number; unique_sessions: number; by_type: Record<string, number> };
  timeseries: ({ date: string } & Record<string, number | string>)[];
  top_titles: { tmdb_id: number; media_type: string; plays: number; opens: number }[];
  recent_searches: { query: string; zero_results: boolean; at: string }[];
  recent_errors: { type: string; at: string; detail: string }[];
  notes: string[];
}

/** Pure aggregation over a window of events — unit-tested in scripts/admin-smoke.ts. */
export function aggregateAnalytics(
  events: Ev[],
  days: number,
  curatedCounts: { movies: number; tv: number }
): AnalyticsSummary {
  const series: Record<string, Record<string, number>> = {};
  for (let i = days - 1; i >= 0; i--) {
    series[dayKey(new Date(Date.now() - i * 24 * 3600 * 1000))] = {};
  }
  const byType: Record<string, number> = {};
  const sessions = new Set<string>();
  const titleCounts = new Map<string, { tmdb_id: number; media_type: string; plays: number; opens: number }>();
  const searches: { query: string; zero_results: boolean; at: string }[] = [];
  const errors: { type: string; at: string; detail: string }[] = [];

  for (const e of events) {
    const day = dayKey(new Date(e.created_at));
    if (!series[day]) series[day] = {};
    series[day][e.event_type] = (series[day][e.event_type] ?? 0) + 1;
    byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
    if (e.session_id) sessions.add(e.session_id);

    if ((e.event_type === 'play_start' || e.event_type === 'title_open') && e.tmdb_id) {
      const k = `${e.media_type}:${e.tmdb_id}`;
      const cur = titleCounts.get(k) ?? { tmdb_id: e.tmdb_id, media_type: e.media_type ?? 'movie', plays: 0, opens: 0 };
      if (e.event_type === 'play_start') cur.plays++;
      else cur.opens++;
      titleCounts.set(k, cur);
    }
    if (e.event_type === 'search' && searches.length < 50) {
      const query = typeof e.meta?.query === 'string' ? e.meta.query.slice(0, 120) : '';
      if (query) searches.push({ query, zero_results: e.meta?.zero_results === true, at: e.created_at });
    }
    if ((e.event_type === 'play_error' || e.event_type === 'api_error') && errors.length < 50) {
      const detail =
        typeof e.meta?.message === 'string'
          ? e.meta.message.slice(0, 160)
          : typeof e.meta?.code === 'string'
            ? e.meta.code.slice(0, 80)
            : '';
      errors.push({ type: e.event_type, at: e.created_at, detail });
    }
  }

  const topTitles = [...titleCounts.values()]
    .sort((a, b) => b.plays - a.plays || b.opens - a.opens)
    .slice(0, 10);

  return {
    window_days: days,
    measured_from: events.length > 0 ? events[events.length - 1].created_at : null,
    curated: {
      movies: curatedCounts.movies,
      tv: curatedCounts.tv,
      note: 'Count of titles in curated collections (TMDB catalogue size is not tracked).',
    },
    totals: {
      events: events.length,
      unique_sessions: sessions.size,
      by_type: byType,
    },
    timeseries: Object.entries(series).map(([date, counts]) => ({ date, ...counts })),
    top_titles: topTitles,
    recent_searches: searches,
    recent_errors: errors,
    notes: [
      'All figures are measured from analytics_events only.',
      'Tracking starts when /api/track is called by the site; no historical data exists before that.',
      'Unique sessions are approximate (random per-visit ids, no fingerprinting).',
    ],
  };
}

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    await requireAdmin(req);
    const q = req.query.days;
    const days = Math.min(Math.max(parseInt(Array.isArray(q) ? q[0] : q ?? '30', 10) || 30, 1), 90);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    // Curated content totals (real DB counts, not estimates)
    const [movieCount, tvCount] = await Promise.all([
      sbCount('curated_titles', { media_type: 'eq.movie' }),
      sbCount('curated_titles', { media_type: 'eq.tv' }),
    ]);

    // Pull the window's events (bounded) and aggregate — honest and simple.
    const events = (await sb.get('analytics_events', {
      created_at: `gte.${since}`,
      select: 'event_type,tmdb_id,media_type,session_id,meta,created_at',
      order: 'created_at.desc',
      limit: 20000,
    })) as unknown as Ev[];

    ok(res, aggregateAnalytics(events, days, { movies: movieCount, tv: tvCount }));
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
