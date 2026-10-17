import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { PasswordField, SubmitButton, FormError } from './fields';
import { authApi, authErrorMessage } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';

export function ResetPasswordPage() {
  const [sessionReady, setSessionReady] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase consumes the recovery tokens from the URL automatically on load.
  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + 4000;
    const poll = async () => {
      try {
        const { data } = await supabase(true).auth.getSession();
        if (data.session) {
          if (!cancelled) setSessionReady('ready');
          return;
        }
      } catch { /* keep polling */ }
      if (!cancelled) {
        if (Date.now() < deadline) setTimeout(poll, 400);
        else setSessionReady('invalid');
      }
    };
    void poll();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errs: Record<string, string> = {};
    if (password.length < 10) errs.password = 'Password must be at least 10 characters.';
    if (confirm !== password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setFormError(null);
    try {
      await authApi.resetPassword(password);
      setDone(true);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sessionReady === 'checking') {
    return (
      <AuthLayout title="Reset password">
        <div className="text-center py-4">
          <span className="inline-block w-8 h-8 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" aria-hidden />
          <p className="mt-4 text-zinc-300 text-sm">Verifying your reset link…</p>
        </div>
      </AuthLayout>
    );
  }

  if (sessionReady === 'invalid') {
    return (
      <AuthLayout title="Reset password">
        <FormError message="This reset link is invalid or has expired. Request a new one." />
        <button onClick={() => navigate('/forgot-password')} className="mt-4 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
          Request a new link
        </button>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <p className="mt-4 text-zinc-200 text-sm">Your password has been reset. Sign in with your new password.</p>
          <button
            onClick={() => navigate('/signin')}
            className="mt-6 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg px-6 py-2.5 transition"
          >
            Sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <PasswordField label="New password" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" placeholder="At least 10 characters" />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" placeholder="Repeat your password" />
        <SubmitButton loading={loading}>Reset password</SubmitButton>
      </form>
    </AuthLayout>
  );
}
