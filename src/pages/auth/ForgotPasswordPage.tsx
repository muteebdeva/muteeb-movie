import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { Field, SubmitButton, FormError, FormSuccess, inputClass } from './fields';
import { authApi, authErrorMessage } from '@/lib/auth';
import { navigate } from '@/lib/router';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError(undefined);
    setLoading(true);
    setFormError(null);
    try {
      const res = await authApi.requestReset(email.trim());
      setSuccess(res.message);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="We'll send you a reset link">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <FormSuccess message={success} />
        <Field label="Email address" error={error}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <SubmitButton loading={loading}>Send reset link</SubmitButton>
        <p className="text-center text-sm text-zinc-400">
          <button type="button" onClick={() => navigate('/signin')} className="text-red-400 hover:text-red-300 font-medium transition-colors">
            Back to sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
