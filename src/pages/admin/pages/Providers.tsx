import { useState } from 'react';
import { Plug, RefreshCw } from 'lucide-react';
import { adminApi, apiErrorMessage, type Provider } from '@/lib/adminApi';
import {
  Card, CardTitle, EmptyState, LoadingBlock, ErrorBlock,
  Toggle, toast, useAsync, useNow, timeAgo, inputCls, Field,
} from '../components/ui';

export function Providers() {
  const now = useNow();
  const list = useAsync<Provider[]>(() => adminApi.providers.list());
  const [drafts, setDrafts] = useState<Record<string, { priority: string; notes: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const draftOf = (p: Provider) =>
    drafts[p.provider_key] ?? { priority: String(p.priority), notes: p.notes ?? '' };

  const save = async (p: Provider, patch: Record<string, unknown>) => {
    setSaving(p.provider_key);
    try {
      await adminApi.providers.update({ provider_key: p.provider_key, ...patch });
      toast.success(`“${p.display_name}” updated`);
      list.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = (p: Provider, is_enabled: boolean) => {
    save(p, { is_enabled });
  };

  const saveMeta = (p: Provider) => {
    const d = draftOf(p);
    save(p, {
      priority: Math.max(0, parseInt(d.priority, 10) || 0),
      notes: d.notes.trim() || null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Streaming providers</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Enable or disable providers and set their fallback priority. The public player only uses enabled providers.
          No credentials are stored here — only non-sensitive flags.
        </p>
      </div>

      <Card>
        <CardTitle
          action={
            <button onClick={list.reload} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          }
        >
          Configured providers
        </CardTitle>
        {list.loading ? <LoadingBlock /> :
          list.error ? <ErrorBlock message={apiErrorMessage(list.error)} onRetry={list.reload} /> :
          (list.data ?? []).length === 0 ? (
            <EmptyState title="No providers configured" hint="Seed data is inserted by the database migration." />
          ) : (
            <ul className="space-y-3">
              {list.data!.map((p) => {
                const d = draftOf(p);
                const dirty =
                  d.priority !== String(p.priority) || (d.notes || '') !== (p.notes ?? '');
                return (
                  <li key={p.provider_key} className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.is_enabled ? 'bg-green-950 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        <Plug className="w-5 h-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{p.display_name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{p.provider_key} · updated {timeAgo(p.updated_at, now)}</p>
                      </div>
                      <Toggle checked={p.is_enabled} onChange={(v) => toggleEnabled(p, v)} label={`Enable ${p.display_name}`} />
                    </div>
                    <div className="grid sm:grid-cols-[120px_1fr_auto] gap-3 items-end">
                      <Field label="Priority">
                        <input
                          value={d.priority}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [p.provider_key]: { ...draftOf(p), priority: e.target.value } }))}
                          inputMode="numeric" className={inputCls}
                        />
                      </Field>
                      <Field label="Notes" hint="Lower priority number = tried first">
                        <input
                          value={d.notes}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [p.provider_key]: { ...draftOf(p), notes: e.target.value } }))}
                          className={inputCls} maxLength={500} placeholder="Internal notes…"
                        />
                      </Field>
                      <button
                        onClick={() => saveMeta(p)}
                        disabled={!dirty || saving === p.provider_key}
                        className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white transition-colors mb-4"
                      >
                        {saving === p.provider_key ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </Card>

      <Card>
        <CardTitle>Diagnostics</CardTitle>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Provider failures surface as <span className="text-zinc-200 font-mono text-xs">play_error</span> events
          on the Analytics page, reported by the site's tracker when the embed signals a failure.
          Automated availability probing is intentionally not built in — probing third-party
          streaming endpoints can look like abuse; enable/disable remains a deliberate human action.
        </p>
      </Card>
    </div>
  );
}
