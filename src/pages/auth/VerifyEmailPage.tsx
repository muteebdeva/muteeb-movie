import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { authApi, authErrorMessage } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';

export function VerifyEmailPage() {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // Supabase consumes verification tokens from the URL automatically on load.
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.includes('?') ? hash.slice(hash.indexOf('?')) : hash.replace(/^#\/?[^?]*\?/, ''));
    const urlError = params.get('error_description') || params.get('error');
    if (urlError) {
      setState('error');
      setMessage(decodeURIComponent(urlError.replace(/\+/g, ' ')));
      return;
    }
    let cancelled = false;
    const deadline = Date.now() + 4000;
    const poll = async () => {
      try {
        const { data } = await supabase(true).auth.getSession();
        const user = data.session?.user;
        if (user?.email_confirmed_at) {
          if (!cancelled) {
            setState('done');
            setMessage('Your email is verified. Enjoy the movies!');
          }
          return;
        }
      } catch { /* keep polling */ }
      if (!cancelled) {
        if (Date.now() < deadline) setTimeout(poll, 400);
        else {
          setState('error');
          setMessage('This verification link is invalid or has expired. Request a new one below.');
        }
      }
    };
    void poll();
    return () => { cancelled = true; };
  }, []);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resending || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(resendEmail.trim())) return;
    setResending(true);
    try {
      await authApi.resendVerification(resendEmail.trim());
      setResent(true);
    } catch (err) {
      setMessage(authErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Email verification">
      <div className="text-center py-4">
        {state === 'working' && (
          <>
            <span className="inline-block w-8 h-8 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" aria-hidden />
            <p className="mt-4 text-zinc-300 text-sm">Verifying your email…</p>
          </>
        )}
        {state === 'done' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="mt-4 text-zinc-200 text-sm">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg px-6 py-2.5 transition"
            >
              Start watching
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="mt-4 text-zinc-200 text-sm">{message}</p>
            {resent ? (
              <p className="mt-4 text-sm text-green-400">New verification email sent. Check your inbox.</p>
            ) : (
              <form onSubmit={resend} className="mt-6 flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2 transition"
                >
                  Resend
                </button>
              </form>
            )}
            <button onClick={() => navigate('/signin')} className="mt-4 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
              Back to sign in
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
