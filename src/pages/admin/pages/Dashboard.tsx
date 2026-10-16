import { useEffect, useState } from 'react';
import { Film, Tv, Activity, Users, AlertTriangle, Search } from 'lucide-react';
import { adminApi, apiErrorMessage, type AnalyticsData, type AuditEntry } from '@/lib/adminApi';
import { getDetails } from '@/lib/tmdb';
import { getTitle } from '@/lib/utils';
import {
  Card, CardTitle, Stat, Table, EmptyState, LoadingBlock, ErrorBlock,
  BarChart, useAsync, useNow, timeAgo,
} from '../components/ui';

function useResolvedTitles(items: { tmdb_id: number; media_type: string }[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const missing = items.filter((t) => !names[`${t.media_type}:${t.tmdb_id}`]).slice(0, 10);
    if (missing.length === 0) return;
    Promise.all(
      missing.map((t) =>
        getDetails(t.media_type === 'tv' ? 'tv' : 'movie', t.tmdb_id)
          .then((d) => ({ key: `${t.media_type}:${t.tmdb_id}`, name: getTitle(d) }))
          .catch(() => ({ key: `${t.media_type}:${t.tmdb_id}`, name: `TMDB ${t.tmdb_id}` }))
      )
    ).then((resolved) => {
      if (cancelled) return;
      setNames((prev) => {
        const next = { ...prev };
        for (const r of resolved) next[r.key] = r.name;
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map((t) => `${t.media_type}:${t.tmdb_id}`))]);
  return names;
}

export function Dashboard() {
  const now = useNow();
  const analytics = useAsync<AnalyticsData>(() => adminApi.analytics(30));
  const audit = useAsync(() => adminApi.audit({ limit: 8 }));
  const data = analytics.data;
  const names = useResolvedTitles(data?.top_titles ?? []);

  if (analytics.loading) return <LoadingBlock message="Loading dashboard…" />;
  if (analytics.error || !data)
    return <ErrorBlock message={apiErrorMessage(analytics.error)} onRetry={analytics.reload} />;

  const chartData = data.timeseries.map((d) => ({
    label: String(d.date),
    value: (Number(d.page_view ?? 0) + Number(d.play_start ?? 0)),
  }));
  const hasEvents = data.totals.events > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {data.measured_from
            ? `Measured from on-site tracking since ${new Date(data.measured_from).toLocaleDateString()}.`
            : 'No tracking data yet — events appear here once the site reports them.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Curated movies" value={data.curated.movies} sub="in collections" />
        <Stat label="Curated TV shows" value={data.curated.tv} sub="in collections" />
        <Stat label={`Events · ${data.window_days}d`} value={data.totals.events.toLocaleString()} sub="tracked on-site" />
        <Stat label="Sessions" value={data.totals.unique_sessions.toLocaleString()} sub="approximate, per-visit ids" />
      </div>

      <Card>
        <CardTitle>Traffic & engagement</CardTitle>
        {hasEvents ? (
          <BarChart data={chartData} />
        ) : (
          <EmptyState
            title="No traffic data yet"
            hint="Page views and plays are recorded by the site's lightweight tracker once the backend is connected. Nothing is fabricated — this chart fills in as real visits happen."
          />
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardTitle>Most played titles</CardTitle>
          {data.top_titles.length === 0 ? (
            <EmptyState title="No plays recorded yet" hint="Titles appear here once visitors start playback." />
          ) : (
            <Table head={['Title', 'Plays', 'Opens']}>
              {data.top_titles.map((t) => (
                <tr key={`${t.media_type}:${t.tmdb_id}`} className="text-zinc-300">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2">
                      {t.media_type === 'tv' ? <Tv className="w-4 h-4 text-zinc-500" /> : <Film className="w-4 h-4 text-zinc-500" />}
                      <span className="truncate">{names[`${t.media_type}:${t.tmdb_id}`] ?? `TMDB ${t.tmdb_id}`}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-white">{t.plays}</td>
                  <td className="py-2.5 pr-4 text-zinc-500">{t.opens}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <CardTitle>Playback & API errors</CardTitle>
          {data.recent_errors.length === 0 ? (
            <EmptyState title="No errors recorded" hint="play_error and api_error events from the site will show up here." />
          ) : (
            <ul className="space-y-2.5">
              {data.recent_errors.slice(0, 8).map((e, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-zinc-300 font-medium">{e.type}</p>
                    {e.detail && <p className="text-zinc-500 truncate text-xs">{e.detail}</p>}
                    <p className="text-zinc-600 text-xs">{timeAgo(e.at, now)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Recent searches</CardTitle>
          {data.recent_searches.length === 0 ? (
            <EmptyState title="No searches tracked yet" />
          ) : (
            <ul className="space-y-2.5">
              {data.recent_searches.slice(0, 8).map((s, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-zinc-300 truncate flex-1">“{s.query}”</span>
                  {s.zero_results && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-900 shrink-0">
                      no results
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Recent admin activity</CardTitle>
          {audit.loading ? (
            <LoadingBlock message="Loading activity…" />
          ) : (audit.data?.entries.length ?? 0) === 0 ? (
            <EmptyState title="No admin actions yet" hint="Every change made in this panel is recorded here." />
          ) : (
            <ul className="space-y-2.5">
              {(audit.data?.entries as AuditEntry[]).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-sm">
                  <Activity className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-zinc-300">
                      <span className="font-medium text-white">{a.action}</span>
                      {a.entity_id && <span className="text-zinc-500"> · {a.entity_id.slice(0, 8)}</span>}
                    </p>
                    <p className="text-zinc-600 text-xs">
                      {a.admin_email ?? 'unknown'} · {timeAgo(a.created_at, now)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>About these numbers</CardTitle>
        <ul className="text-xs text-zinc-500 space-y-1.5 list-disc pl-4">
          {data.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
          <li className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> User accounts are not enabled on this site, so there is no registered-user metric.</li>
        </ul>
      </Card>
    </div>
  );
}
