import { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { Field, PasswordField, SubmitButton, FormError, FormSuccess, inputClass } from './fields';
import { authApi, setSignedInUser, authErrorMessage } from '@/lib/auth';
import { navigate } from '@/lib/router';

export function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errs: Record<string, string> = {};
    if (name.trim().length < 1 || name.trim().length > 60) errs.name = 'Enter your name (1–60 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (password.length < 10) errs.password = 'Password must be at least 10 characters.';
    if (confirm !== password) errs.confirm = 'Passwords do not match.';
    if (!terms) errs.terms = 'You must accept the terms and privacy policy.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setFormError(null);
    try {
      const { user, verificationSent } = await authApi.signup(name.trim(), email.trim(), password, terms);
      setSignedInUser(user);
      if (verificationSent && !user.emailVerified) {
        setSuccess('Account created! Please check your email to verify your address.');
      } else {
        navigate('/');
        return;
      }
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join to keep track of what you watch">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <FormSuccess message={success} />
        <Field label="Display name" error={errors.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Your name"
            className={inputClass}
          />
        </Field>
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
        <PasswordField label="Password" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" placeholder="At least 10 characters" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" placeholder="Repeat your password" />
        <div>
          <label className="flex items-start gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-red-600"
            />
            <span>
              I accept the <span className="text-red-400">Terms of Service</span> and{' '}
              <span className="text-red-400">Privacy Policy</span>
            </span>
          </label>
          {errors.terms && <span className="block mt-1.5 text-sm text-red-400">{errors.terms}</span>}
        </div>
        <SubmitButton loading={loading}>Create account</SubmitButton>
        <p className="text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/signin')} className="text-red-400 hover:text-red-300 font-medium transition-colors">
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
