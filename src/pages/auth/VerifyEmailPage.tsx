import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { authApi, authErrorMessage } from '@/lib/auth';
import { navigate, useHashRoute } from '@/lib/router';

export function VerifyEmailPage() {
  const route = useHashRoute();
  const token = route.query.token ?? '';
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    authApi.verifyEmail(token)
      .then(() => {
        setState('done');
        setMessage('Your email is verified. Enjoy the movies!');
      })
      .catch((e) => {
        setState('error');
        setMessage(authErrorMessage(e));
      });
  }, [token]);

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
            <button onClick={() => navigate('/signin')} className="mt-6 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
              Back to sign in
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
