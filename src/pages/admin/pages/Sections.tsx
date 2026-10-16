import { ArrowUp, ArrowDown } from 'lucide-react';
import { adminApi, apiErrorMessage, type Section } from '@/lib/adminApi';
import {
  Card, CardTitle, EmptyState, LoadingBlock, ErrorBlock,
  Toggle, toast, useAsync,
} from '../components/ui';

export function Sections() {
  const list = useAsync<Section[]>(() => adminApi.sections.list());

  const persist = async (sections: Section[]) => {
    try {
      await adminApi.sections.save(
        sections.map((s, i) => ({ section_key: s.section_key, sort_order: i, is_visible: s.is_visible, title: s.title }))
      );
      list.setData(sections);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      list.reload();
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const sections = [...(list.data ?? [])];
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    [sections[index], sections[j]] = [sections[j], sections[index]];
    persist(sections.map((s, i) => ({ ...s, sort_order: i })));
    toast.info('Order saved');
  };

  const toggle = (index: number, is_visible: boolean) => {
    const sections = (list.data ?? []).map((s, i) => (i === index ? { ...s, is_visible } : s));
    persist(sections);
  };

  const rename = (index: number, title: string) => {
    const sections = (list.data ?? []).map((s, i) => (i === index ? { ...s, title } : s));
    list.setData(sections);
  };

  const commitRename = () => {
    const sections = list.data ?? [];
    persist(sections);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Homepage sections</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Control which shelves appear on the public homepage and in what order. Changes apply on the next page load.
        </p>
      </div>

      <Card>
        <CardTitle>Section order</CardTitle>
        {list.loading ? <LoadingBlock /> :
          list.error ? <ErrorBlock message={apiErrorMessage(list.error)} onRetry={list.reload} /> :
          (list.data ?? []).length === 0 ? (
            <EmptyState title="No sections configured" />
          ) : (
            <ul className="space-y-2">
              {list.data!.map((s, i) => (
                <li
                  key={s.section_key}
                  className={`flex items-center gap-3 bg-zinc-950/60 border rounded-xl p-3 transition-colors ${
                    s.is_visible ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
                  }`}
                >
                  <span className="flex flex-col shrink-0">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30" aria-label="Move up">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === list.data!.length - 1} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30" aria-label="Move down">
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </span>
                  <input
                    value={s.title}
                    onChange={(e) => rename(i, e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    className="flex-1 min-w-0 bg-transparent text-sm font-medium text-white outline-none border-b border-transparent focus:border-red-500 transition-colors"
                    aria-label="Section title"
                    maxLength={120}
                  />
                  <span className="hidden sm:block text-[11px] text-zinc-600 font-mono truncate max-w-[180px]">{s.source}</span>
                  <Toggle checked={s.is_visible} onChange={(v) => toggle(i, v)} label={`Show ${s.title}`} />
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  );
}
