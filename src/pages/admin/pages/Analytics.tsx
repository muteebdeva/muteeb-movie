import { useState } from 'react';
import { adminApi, apiErrorMessage, type AnalyticsData } from '@/lib/adminApi';
import {
  Card, CardTitle, Table, EmptyState, LoadingBlock, ErrorBlock,
  BarChart, useAsync, useNow, timeAgo,
} from '../components/ui';

const RANGES = [7, 30, 90];

export function Analytics() {
  const [days, setDays] = useState(30);
  const now = useNow();
  const a = useAsync<AnalyticsData>(() => adminApi.analytics(days), [days]);
  const data = a.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">Measured on-site events. Nothing here is estimated.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                days === d ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {a.loading ? <LoadingBlock message="Crunching events…" /> :
        a.error || !data ? <ErrorBlock message={apiErrorMessage(a.error)} onRetry={a.reload} /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              ['Events', data.totals.events.toLocaleString()],
              ['Sessions (approx)', data.totals.unique_sessions.toLocaleString()],
              ['Plays', String(data.totals.by_type.play_start ?? 0)],
              ['Errors', String((data.totals.by_type.play_error ?? 0) + (data.totals.by_type.api_error ?? 0))],
            ].map(([label, value]) => (
              <Card key={label}>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">{label}</p>
                <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardTitle>Events per day</CardTitle>
            {data.totals.events === 0 ? (
              <EmptyState title="No events in this window" hint="Tracking starts when the site reports events to /api/track." />
            ) : (
              <BarChart
                data={data.timeseries.map((d) => ({
                  label: String(d.date),
                  value: Object.entries(d).reduce((sum, [k, v]) => (k === 'date' ? sum : sum + Number(v)), 0),
                }))}
                height={180}
              />
            )}
          </Card>

          <Card>
            <CardTitle>Event breakdown</CardTitle>
            {Object.keys(data.totals.by_type).length === 0 ? (
              <EmptyState title="Nothing to break down yet" />
            ) : (
              <Table head={['Event', 'Count', 'Share']}>
                {Object.entries(data.totals.by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <tr key={type} className="text-zinc-300">
                      <td className="py-2.5 pr-4 font-mono text-xs text-white">{type}</td>
                      <td className="py-2.5 pr-4 font-semibold text-white">{count.toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-zinc-500 text-xs">
                        {data.totals.events > 0 ? `${((count / data.totals.events) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
              </Table>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardTitle>Zero-result searches</CardTitle>
              {data.recent_searches.filter((s) => s.zero_results).length === 0 ? (
                <EmptyState title="No zero-result searches" hint="Searches that return nothing will be flagged here — useful for spotting missing titles." />
              ) : (
                <ul className="space-y-2">
                  {data.recent_searches.filter((s) => s.zero_results).slice(0, 15).map((s, i) => (
                    <li key={i} className="flex items-center justify-between text-sm gap-3">
                      <span className="text-zinc-300 truncate">“{s.query}”</span>
                      <span className="text-xs text-zinc-600 shrink-0">{timeAgo(s.at, now)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardTitle>Error log</CardTitle>
              {data.recent_errors.length === 0 ? (
                <EmptyState title="No errors recorded" />
              ) : (
                <ul className="space-y-2.5">
                  {data.recent_errors.slice(0, 15).map((e, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-zinc-300 font-mono text-xs">{e.type}</p>
                      {e.detail && <p className="text-zinc-500 truncate text-xs">{e.detail}</p>}
                      <p className="text-zinc-600 text-xs">{timeAgo(e.at, now)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle>Methodology</CardTitle>
            <ul className="text-xs text-zinc-500 space-y-1.5 list-disc pl-4">
              {data.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
