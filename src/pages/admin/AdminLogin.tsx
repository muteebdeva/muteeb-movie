import { useState } from 'react';
import { Clapperboard, Lock } from 'lucide-react';
import { adminApi, apiErrorMessage, type AdminUser } from '@/lib/adminApi';
import { Field, inputCls, PrimaryButton } from './components/ui';

export function AdminLogin({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminApi.login(email.trim(), password);
      const me = await adminApi.me();
      onLogin(me);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <span className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-white" />
          </span>
          <div>
            <p className="text-lg font-bold text-white leading-tight">Muteeb Movie</p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5 text-zinc-300">
            <Lock className="w-4 h-4" />
            <h1 className="text-base font-semibold">Administrator sign in</h1>
          </div>
          <Field label="Email">
            <input
              type="email" required autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls} placeholder="admin@example.com"
            />
          </Field>
          <Field label="Password">
            <input
              type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls} placeholder="••••••••"
            />
          </Field>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-900/60 rounded-lg px-3 py-2.5 mb-4" role="alert">
              {error}
            </p>
          )}
          <PrimaryButton disabled={busy}>
            <span className="block w-full text-center">{busy ? 'Signing in…' : 'Sign in'}</span>
          </PrimaryButton>
          <p className="text-xs text-zinc-600 mt-4 text-center">
            Only allowlisted administrator accounts can sign in.
          </p>
        </form>
      </div>
    </div>
  );
}
