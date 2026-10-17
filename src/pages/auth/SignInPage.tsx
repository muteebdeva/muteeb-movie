import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { Field, PasswordField, SubmitButton, FormError, inputClass } from './fields';
import { authApi, setSignedInUser, authErrorMessage } from '@/lib/auth';
import { navigate } from '@/lib/router';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errs: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setFormError(null);
    try {
      const { user } = await authApi.signin(email.trim(), password, remember);
      setSignedInUser(user);
      navigate('/');
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label="Email address" error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" placeholder="••••••••••" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            Remember me
          </label>
          <button type="button" onClick={() => navigate('/forgot-password')} className="text-red-400 hover:text-red-300 transition-colors">
            Forgot password?
          </button>
        </div>
        <SubmitButton loading={loading}>Sign in</SubmitButton>
        <p className="text-center text-sm text-zinc-400">
          New here?{' '}
          <button type="button" onClick={() => navigate('/signup')} className="text-red-400 hover:text-red-300 font-medium transition-colors">
            Create an account
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
