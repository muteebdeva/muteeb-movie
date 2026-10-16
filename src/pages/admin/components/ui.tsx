import { useCallback, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, Inbox } from 'lucide-react';

// ---------------------------------------------------------------------------
// Toasts (module-level API, no context needed)
// ---------------------------------------------------------------------------
type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }
let toastSeq = 0;
const toastListeners = new Set<(t: Toast) => void>();

export const toast = {
  push(kind: ToastKind, message: string) {
    const t = { id: ++toastSeq, kind, message };
    toastListeners.forEach((l) => l(t));
  },
  success: (m: string) => toast.push('success', m),
  error: (m: string) => toast.push('error', m),
  info: (m: string) => toast.push('info', m),
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const l = (t: Toast) => {
      setItems((prev) => [...prev.slice(-3), t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4200);
    };
    toastListeners.add(l);
    return () => { toastListeners.delete(l); };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)]" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 shadow-2xl shadow-black/60 text-sm text-zinc-100"
        >
          {t.kind === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
          {t.kind === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          {t.kind === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          <span className="break-words">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog (promise-based)
// ---------------------------------------------------------------------------
interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
let confirmResolve: ((v: boolean) => void) | null = null;
const confirmListeners = new Set<(o: (ConfirmOpts & { key: number }) | null) => void>();
let confirmSeq = 0;

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    confirmListeners.forEach((l) => l({ ...opts, key: ++confirmSeq }));
  });
}

export function ConfirmHost() {
  const [opts, setOpts] = useState<(ConfirmOpts & { key: number }) | null>(null);
  useEffect(() => {
    const l = (o: (ConfirmOpts & { key: number }) | null) => setOpts(o);
    confirmListeners.add(l);
    return () => { confirmListeners.delete(l); };
  }, []);
  const done = (v: boolean) => {
    setOpts(null);
    confirmResolve?.(v);
    confirmResolve = null;
  };
  if (!opts) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => done(false)}>
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog" aria-modal="true" aria-label={opts.title}
      >
        <h3 className="text-lg font-semibold text-white mb-2">{opts.title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{opts.message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => done(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => done(true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              opts.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
          >
            {opts.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 ${className}`}>{children}</div>
  );
}

export function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-white">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1.5">{sub}</p>}
    </Card>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <Inbox className="w-10 h-10 text-zinc-700" />
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="text-xs text-zinc-500 max-w-sm">{hint}</p>}
    </div>
  );
}

export function LoadingBlock({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-zinc-400 text-sm">
      <span className="w-5 h-5 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />
      {message}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <AlertTriangle className="w-8 h-8 text-red-500" />
      <p className="text-sm text-zinc-300 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            {head.map((h) => (
              <th key={h} className="py-2.5 pr-4 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/70">{children}</tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-600 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-red-500 transition-colors';

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-red-600' : 'bg-zinc-700'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export function PrimaryButton({ children, onClick, disabled, danger }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
        danger ? 'bg-red-600 hover:bg-red-500' : 'bg-red-600 hover:bg-red-500'
      }`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} bg-zinc-900 border border-zinc-700 rounded-2xl p-6 my-8 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple SVG bar chart (no dependencies)
// ---------------------------------------------------------------------------
export function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 560, H = height, pad = 6;
  const bw = (W - pad * 2) / Math.max(1, data.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const h = Math.max(2, ((H - pad * 2 - 18) * d.value) / max);
        const x = pad + i * bw + bw * 0.2;
        return (
          <g key={d.label}>
            <rect x={x} y={H - 18 - h} width={Math.max(2, bw * 0.6)} height={h} rx={3}
              className="fill-red-600/80" />
            {(i % Math.ceil(data.length / 8) === 0) && (
              <text x={x} y={H - 5} fontSize={9} className="fill-zinc-500">{d.label.slice(5)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function timeAgo(iso: string, now: number): string {
  const s = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setV(value), ms);
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [value, ms]);
  return v;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}
