import { useState } from 'react';
import { adminApi, apiErrorMessage } from '@/lib/adminApi';
import {
  Card, CardTitle, LoadingBlock, ErrorBlock, Field, inputCls,
  Toggle, toast, useAsync,
} from '../components/ui';

function useSettingForm<T extends Record<string, unknown>>(initial: T, key: string) {
  const [draft, setDraft] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof T>(k: K, v: T[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setTouched(true);
  };

  const save = async (reload: () => void) => {
    setBusy(true);
    try {
      await adminApi.settings.update(key, draft as Record<string, unknown>);
      toast.success('Setting saved');
      setTouched(false);
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { draft, set, save, busy, touched };
}

function SaveBar({ touched, busy, onSave }: { touched: boolean; busy: boolean; onSave: () => void }) {
  return (
    <button
      onClick={onSave}
      disabled={!touched || busy}
      className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors"
    >
      {busy ? 'Saving…' : 'Save changes'}
    </button>
  );
}

function SettingsForms({ settings, reload }: { settings: Record<string, unknown>; reload: () => void }) {
  const branding = useSettingForm(
    { site_name: 'Muteeb Movie', tagline: '', ...((settings.branding as Record<string, unknown>) ?? {}) },
    'branding'
  );
  const maintenance = useSettingForm(
    { enabled: false, message: '', ...((settings.maintenance as Record<string, unknown>) ?? {}) },
    'maintenance'
  );
  const announcement = useSettingForm(
    { enabled: false, text: '', ...((settings.announcement as Record<string, unknown>) ?? {}) },
    'announcement'
  );
  const player = useSettingForm(
    { autoplay: false, default_quality: 'auto', ...((settings.player as Record<string, unknown>) ?? {}) },
    'player'
  );

  return (
    <>
      <Card>
        <CardTitle action={<SaveBar touched={branding.touched} busy={branding.busy} onSave={() => branding.save(reload)} />}>
          Branding
        </CardTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Site name">
            <input value={String(branding.draft.site_name ?? '')} onChange={(e) => branding.set('site_name', e.target.value)} className={inputCls} maxLength={60} />
          </Field>
          <Field label="Tagline">
            <input value={String(branding.draft.tagline ?? '')} onChange={(e) => branding.set('tagline', e.target.value)} className={inputCls} maxLength={120} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle action={<SaveBar touched={announcement.touched} busy={announcement.busy} onSave={() => announcement.save(reload)} />}>
          Announcement banner
        </CardTitle>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-300">Show a dismissible banner under the navbar</span>
          <Toggle checked={!!announcement.draft.enabled} onChange={(v) => announcement.set('enabled', v)} label="Show announcement" />
        </div>
        <Field label="Banner text">
          <input value={String(announcement.draft.text ?? '')} onChange={(e) => announcement.set('text', e.target.value)} className={inputCls} maxLength={300} />
        </Field>
      </Card>

      <Card>
        <CardTitle action={<SaveBar touched={player.touched} busy={player.busy} onSave={() => player.save(reload)} />}>
          Player defaults
        </CardTitle>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-300">Attempt autoplay <span className="text-zinc-600">(where the browser allows)</span></span>
          <Toggle checked={!!player.draft.autoplay} onChange={(v) => player.set('autoplay', v)} label="Autoplay" />
        </div>
        <Field label="Default quality">
          <select value={String(player.draft.default_quality ?? 'auto')} onChange={(e) => player.set('default_quality', e.target.value)} className={inputCls}>
            <option value="auto">Auto</option>
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="360p">360p</option>
          </select>
        </Field>
      </Card>

      <Card>
        <CardTitle action={<SaveBar touched={maintenance.touched} busy={maintenance.busy} onSave={() => maintenance.save(reload)} />}>
          Maintenance mode
        </CardTitle>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-zinc-300">Take the public site offline <span className="text-zinc-600">(the admin panel stays reachable)</span></span>
          <Toggle checked={!!maintenance.draft.enabled} onChange={(v) => maintenance.set('enabled', v)} label="Maintenance mode" />
        </div>
        <Field label="Message shown to visitors">
          <input value={String(maintenance.draft.message ?? '')} onChange={(e) => maintenance.set('message', e.target.value)} className={inputCls} maxLength={300} placeholder="We will be back shortly." />
        </Field>
      </Card>
    </>
  );
}

export function Settings() {
  const s = useAsync<Record<string, unknown>>(() => adminApi.settings.get());

  if (s.loading) return <LoadingBlock message="Loading settings…" />;
  if (s.error || !s.data)
    return <ErrorBlock message={apiErrorMessage(s.error)} onRetry={s.reload} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Site-wide configuration. Changes apply on the next page load of the public site.</p>
      </div>
      <SettingsForms settings={s.data} reload={s.reload} />
    </div>
  );
}
