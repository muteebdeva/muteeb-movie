import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi, apiErrorMessage, type Collection } from '@/lib/adminApi';
import {
  Card, CardTitle, Table, EmptyState, LoadingBlock, ErrorBlock, Modal, Field,
  inputCls, Toggle, PrimaryButton, GhostButton, toast, confirmDialog, useAsync,
} from '../components/ui';

function CollectionForm({ initial, onClose, onSaved }: {
  initial?: Collection; onClose: () => void; onSaved: () => void;
}) {
  const isNew = !initial;
  const [key, setKey] = useState(initial?.key ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sort_order, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [is_visible, setIsVisible] = useState(initial?.is_visible ?? true);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.collections.save({
        key: key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        title: title.trim(),
        description: description.trim() || null,
        sort_order: Math.max(0, parseInt(sort_order, 10) || 0),
        is_visible,
      }, isNew);
      toast.success(isNew ? 'Collection created' : 'Collection updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Field label="Key" hint="Lowercase letters, numbers, underscores. Used in URLs and config.">
        <input value={key} onChange={(e) => setKey(e.target.value)} disabled={!isNew} className={inputCls} required maxLength={64} />
      </Field>
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required maxLength={120} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-[70px]`} maxLength={500} />
      </Field>
      <div className="grid grid-cols-2 gap-4 items-end">
        <Field label="Sort order">
          <input value={sort_order} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" className={inputCls} />
        </Field>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-300">Visible</span>
          <Toggle checked={is_visible} onChange={setIsVisible} label="Visible" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create' : 'Save'}</PrimaryButton>
      </div>
    </form>
  );
}

export function Collections() {
  const list = useAsync<Collection[]>(() => adminApi.collections.list());
  const [editing, setEditing] = useState<Collection | null | 'new'>(null);

  const remove = async (c: Collection) => {
    const okConfirm = await confirmDialog({
      title: 'Delete collection?',
      message: `“${c.title}” will be deleted. This is refused while any curated titles still use it — remove those first.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!okConfirm) return;
    try {
      await adminApi.collections.remove(c.key);
      toast.success('Collection deleted');
      list.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Collections</h1>
        <p className="text-sm text-zinc-500 mt-1">Curated shelves you can attach titles to and surface on the homepage.</p>
      </div>

      <Card>
        <CardTitle
          action={
            <button
              onClick={() => setEditing('new')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> New collection
            </button>
          }
        >
          All collections
        </CardTitle>
        {list.loading ? <LoadingBlock /> :
          list.error ? <ErrorBlock message={apiErrorMessage(list.error)} onRetry={list.reload} /> :
          (list.data ?? []).length === 0 ? (
            <EmptyState title="No collections yet" hint="Create one to start curating titles." />
          ) : (
            <Table head={['Title', 'Key', 'Order', 'Visible', '']}>
              {list.data!.map((c) => (
                <tr key={c.key} className="text-zinc-300">
                  <td className="py-2.5 pr-4 font-medium text-white">{c.title}</td>
                  <td className="py-2.5 pr-4 text-xs text-zinc-500 font-mono">{c.key}</td>
                  <td className="py-2.5 pr-4 text-xs text-zinc-500">{c.sort_order}</td>
                  <td className="py-2.5 pr-4 text-xs">{c.is_visible ? 'Yes' : 'No'}</td>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(c)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" aria-label="Edit collection">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(c)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg" aria-label="Delete collection">
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
        <Modal title={editing === 'new' ? 'New collection' : 'Edit collection'} onClose={() => setEditing(null)}>
          <CollectionForm
            initial={editing === 'new' ? undefined : editing}
            onClose={() => setEditing(null)}
            onSaved={list.reload}
          />
        </Modal>
      )}
    </div>
  );
}
