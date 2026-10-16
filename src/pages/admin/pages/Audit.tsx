import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi, apiErrorMessage } from '@/lib/adminApi';
import {
  Card, CardTitle, Table, EmptyState, LoadingBlock, ErrorBlock,
  useAsync, useNow, timeAgo,
} from '../components/ui';

const PAGE_SIZE = 25;

export function Audit() {
  const now = useNow();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const a = useAsync(
    () => adminApi.audit({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, action: actionFilter || undefined }),
    [page, actionFilter]
  );
  const entries = a.data?.entries ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Audit log</h1>
        <p className="text-sm text-zinc-500 mt-1">Every administrative action, recorded server-side. Append-only.</p>
      </div>

      <Card>
        <CardTitle
          action={
            <input
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              placeholder="Filter by action…"
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-red-500"
              aria-label="Filter by action"
            />
          }
        >
          Administrative activity
        </CardTitle>
        {a.loading ? <LoadingBlock /> :
          a.error ? <ErrorBlock message={apiErrorMessage(a.error)} onRetry={a.reload} /> :
          entries.length === 0 ? (
            <EmptyState title="No audit entries" hint="Actions you take in this panel will appear here." />
          ) : (
            <>
              <Table head={['Action', 'Admin', 'Details', 'When']}>
                {entries.map((e) => (
                  <tr key={e.id} className="text-zinc-300">
                    <td className="py-2.5 pr-4">
                      <span className="font-mono text-xs text-white">{e.action}</span>
                      {e.entity_id && <span className="block text-[11px] text-zinc-600">{e.entity_id.slice(0, 12)}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-zinc-500 max-w-[160px] truncate">{e.admin_email ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-xs text-zinc-500 max-w-[220px] truncate">
                      {Object.keys(e.details ?? {}).length > 0 ? JSON.stringify(e.details).slice(0, 80) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-zinc-500 whitespace-nowrap">{timeAgo(e.created_at, now)}</td>
                  </tr>
                ))}
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-zinc-600">Page {page + 1}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={entries.length < PAGE_SIZE}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
      </Card>
    </div>
  );
}
