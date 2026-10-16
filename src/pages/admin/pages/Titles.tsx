import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Star, X } from 'lucide-react';
import type { Movie } from '@/types';
import { searchMulti, imgUrl } from '@/lib/tmdb';
import { getTitle, getMediaType, formatYear, getReleaseDate } from '@/lib/utils';
import { adminApi, apiErrorMessage, type CuratedTitle, type Collection } from '@/lib/adminApi';
import {
  Card, CardTitle, Table, EmptyState, LoadingBlock, ErrorBlock, Modal, Field,
  inputCls, Toggle, PrimaryButton, GhostButton, toast, confirmDialog,
  useAsync, useDebounced,
} from '../components/ui';

function TitleForm({
  initial, collections, onSave, onClose,
}: {
  initial: Partial<CuratedTitle> & { tmdb_id: number; media_type: 'movie' | 'tv' };
  collections: Collection[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [collection_key, setCollectionKey] = useState(initial.collection_key ?? 'custom');
  const [sort_order, setSortOrder] = useState(String(initial.sort_order ?? 0));
  const [is_featured, setIsFeatured] = useState(!!initial.is_featured);
  const [is_hidden, setIsHidden] = useState(!!initial.is_hidden);
  const [custom_title, setCustomTitle] = useState(initial.custom_title ?? '');
  const [custom_overview, setCustomOverview] = useState(initial.custom_overview ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        id: initial.id,
        tmdb_id: initial.tmdb_id,
        media_type: initial.media_type,
        collection_key,
        sort_order: Math.max(0, parseInt(sort_order, 10) || 0),
        is_featured,
        is_hidden,
        custom_title: custom_title.trim() || null,
        custom_overview: custom_overview.trim() || null,
      });
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Collection">
          <select value={collection_key} onChange={(e) => setCollectionKey(e.target.value)} className={inputCls}>
            {collections.map((c) => (
              <option key={c.key} value={c.key}>{c.title}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </Field>
        <Field label="Sort order" hint="Lower appears first">
          <input value={sort_order} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" className={inputCls} />
        </Field>
      </div>
      <Field label="Display title override" hint="Leave empty to use the TMDB title">
        <input value={custom_title} onChange={(e) => setCustomTitle(e.target.value)} className={inputCls} maxLength={200} />
      </Field>
      <Field label="Description override" hint="Leave empty to use the TMDB overview">
        <textarea value={custom_overview} onChange={(e) => setCustomOverview(e.target.value)} className={`${inputCls} min-h-[90px]`} maxLength={2000} />
      </Field>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Featured <span className="text-zinc-600">— highlighted placement</span></span>
          <Toggle checked={is_featured} onChange={setIsFeatured} label="Featured" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Hidden <span className="text-zinc-600">— excluded from public shelves</span></span>
          <Toggle checked={is_hidden} onChange={setIsHidden} label="Hidden" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Save title'}</PrimaryButton>
      </div>
    </form>
  );
}

function TmdbSearch({ collections, onAdded }: { collections: Collection[]; onAdded: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ tmdb_id: number; media_type: 'movie' | 'tv' } | null>(null);
  const debounced = useDebounced(query.trim(), 400);

  const runSearch = async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setBusy(true);
    try {
      const data = await searchMulti(q, 1);
      setResults((data.results || []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 10));
    } catch {
      toast.error('TMDB search failed. Check the API key and try again.');
    } finally {
      setBusy(false);
    }
  };

  const add = async (m: Movie) => {
    const media_type = getMediaType(m);
    setAdding(m.id);
    try {
      await adminApi.titles.add({ tmdb_id: m.id, media_type, collection_key: 'custom' });
      toast.success(`“${getTitle(m)}” added to curation`);
      onAdded();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div>
      <div className="flex items-center bg-zinc-950 border border-zinc-700 rounded-xl px-3 mb-4 focus-within:border-red-500 transition-colors">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
          onKeyDown={(e) => e.key === 'Enter' && runSearch(debounced)}
          placeholder="Search TMDB to add a title… (Enter)"
          className="bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none flex-1 px-2 py-3"
          aria-label="Search TMDB"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-zinc-500 hover:text-white px-1" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {busy && <LoadingBlock message="Searching TMDB…" />}
      {!busy && debounced.length >= 2 && results.length === 0 && (
        <EmptyState title="No TMDB results" hint="Try a different spelling or title." />
      )}
      <ul className="space-y-2">
        {results.map((m) => {
          const type = getMediaType(m);
          const year = formatYear(getReleaseDate(m));
          return (
            <li key={`${m.id}-${type}`} className="flex items-center gap-3 bg-zinc-950/60 border border-zinc-800 rounded-xl p-2.5">
              {m.poster_path ? (
                <img src={imgUrl(m.poster_path, 'w92')} alt="" className="w-10 h-14 object-cover rounded-md shrink-0" loading="lazy" />
              ) : (
                <div className="w-10 h-14 rounded-md bg-zinc-800 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{getTitle(m)}</p>
                <p className="text-xs text-zinc-500">{type === 'tv' ? 'TV' : 'Movie'}{year && ` · ${year}`} · ★ {(m.vote_average ?? 0).toFixed(1)}</p>
              </div>
              <button
                onClick={() => setEditing({ tmdb_id: m.id, media_type: type })}
                className="px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              >
                Options
              </button>
              <button
                onClick={() => add(m)}
                disabled={adding === m.id}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> {adding === m.id ? 'Adding…' : 'Add'}
              </button>
            </li>
          );
        })}
      </ul>

      {editing && (
        <Modal title="Add title to curation" onClose={() => setEditing(null)}>
          <TitleForm
            initial={editing}
            collections={collections}
            onClose={() => setEditing(null)}
            onSave={async (body) => {
              await adminApi.titles.add(body);
              toast.success('Title added to curation');
              onAdded();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export function Titles() {
  const [collectionFilter, setCollectionFilter] = useState('');
  const curated = useAsync(() => adminApi.titles.list(
    collectionFilter ? { collection: collectionFilter } : {}
  ), [collectionFilter]);
  const collections = useAsync<Collection[]>(() => adminApi.collections.list());
  const [editing, setEditing] = useState<CuratedTitle | null>(null);

  const remove = async (t: CuratedTitle) => {
    const okConfirm = await confirmDialog({
      title: 'Remove from curation?',
      message: `“${t.custom_title || `TMDB ${t.tmdb_id}`}” will be removed from the ${t.collection_key} collection. Nothing is deleted from TMDB.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!okConfirm) return;
    try {
      await adminApi.titles.remove(t.id);
      toast.success('Removed from curation');
      curated.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Titles</h1>
        <p className="text-sm text-zinc-500 mt-1">Curate which titles appear on your site. TMDB metadata is never modified — only your overrides.</p>
      </div>

      <Card>
        <CardTitle>Add from TMDB</CardTitle>
        <TmdbSearch collections={collections.data ?? []} onAdded={curated.reload} />
      </Card>

      <Card>
        <CardTitle
          action={
            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
              aria-label="Filter by collection"
            >
              <option value="">All collections</option>
              {(collections.data ?? []).map((c) => (
                <option key={c.key} value={c.key}>{c.title}</option>
              ))}
            </select>
          }
        >
          Curated titles
        </CardTitle>
        {curated.loading ? <LoadingBlock /> :
          curated.error ? <ErrorBlock message={apiErrorMessage(curated.error)} onRetry={curated.reload} /> :
          curated.data!.titles.length === 0 ? (
            <EmptyState title="No curated titles yet" hint="Search TMDB above and add titles to a collection." />
          ) : (
            <Table head={['Title', 'Collection', 'Flags', 'Order', '']}>
              {curated.data!.titles.map((t) => (
                <tr key={t.id} className="text-zinc-300">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-white truncate max-w-[220px]">{t.custom_title || `TMDB ${t.tmdb_id}`}</p>
                    <p className="text-xs text-zinc-500">{t.media_type === 'tv' ? 'TV' : 'Movie'} · id {t.tmdb_id}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-xs"><span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300">{t.collection_key}</span></td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2 text-xs text-zinc-500">
                      {t.is_featured && <span className="flex items-center gap-1 text-amber-400"><Star className="w-3.5 h-3.5" /> feat</span>}
                      {t.is_hidden ? <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> hidden</span> : <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /></span>}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-zinc-500 text-xs">{t.sort_order}</td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(t)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" aria-label="Edit" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(t)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg" aria-label="Remove" title="Remove from curation">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {editing && (
        <Modal title="Edit curated title" onClose={() => setEditing(null)}>
          <TitleForm
            initial={editing}
            collections={collections.data ?? []}
            onClose={() => setEditing(null)}
            onSave={async (body) => {
              await adminApi.titles.update(body);
              toast.success('Title updated');
              curated.reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
