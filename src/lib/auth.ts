// Auth client for the movie site. All calls go through same-origin
// /api/auth/* proxy routes (first-party cookies). The browser never talks
// to the auth backend directly and never sees tokens.
import { useCallback, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: string;
}

export class AuthApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

async function req(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`/api/auth${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean; data?: unknown; code?: string; message?: string;
  } | null;
  if (!res.ok || !data || data.ok !== true) {
    throw new AuthApiError(
      res.status,
      data?.code ?? 'unknown',
      data?.message ?? `Request failed (${res.status})`
    );
  }
  return data.data;
}

export const authApi = {
  me: () => req('/me') as Promise<{ user: AuthUser }>,
  signin: (email: string, password: string, remember: boolean) =>
    req('/signin', { method: 'POST', body: JSON.stringify({ email, password, remember }) }) as Promise<{
      user: AuthUser; session: { token: string; expiresAt: string };
    }>,
  signup: (displayName: string, email: string, password: string, terms: boolean) =>
    req('/signup', { method: 'POST', body: JSON.stringify({ displayName, email, password, terms }) }) as Promise<{
      user: AuthUser; session: { token: string; expiresAt: string }; verificationSent: boolean;
    }>,
  signout: () => req('/signout', { method: 'POST' }) as Promise<{ signedOut: boolean }>,
  verifyEmail: (token: string) =>
    req('/verify-email', { method: 'POST', body: JSON.stringify({ token }) }) as Promise<{ user: AuthUser }>,
  requestReset: (email: string) =>
    req('/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) }) as Promise<{
      ok: boolean; emailConfigured: boolean; message: string;
    }>,
  resetPassword: (token: string, password: string) =>
    req('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }) as Promise<{ ok: boolean }>,
};

/** Friendly messages for auth error codes. */
export function authErrorMessage(e: unknown): string {
  if (e instanceof AuthApiError) {
    switch (e.code) {
      case 'invalid_credentials': return 'Incorrect email or password.';
      case 'email_in_use': return 'An account with this email already exists. Try signing in.';
      case 'email_not_verified': return 'Please verify your email address before signing in.';
      case 'account_suspended': return 'This account has been suspended.';
      case 'invalid_token': return 'This link is invalid or has expired.';
      case 'weak_password': return e.message;
      case 'invalid_email': return 'Enter a valid email address.';
      case 'rate_limited': return 'Too many attempts. Please wait a moment and try again.';
      case 'auth_not_configured': return 'Sign-in is not configured yet. Please try again later.';
      case 'auth_unreachable': return 'Could not reach the sign-in service. Check your connection.';
      default: return e.message || 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signout: () => Promise<void>;
}

let cachedUser: AuthUser | null | undefined;
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

async function loadUser(): Promise<void> {
  try {
    const { user } = await authApi.me();
    cachedUser = user;
  } catch {
    cachedUser = null;
  }
  notify();
}

/** Global auth state hook — session is verified against the server on mount. */
export function useAuth(): AuthState {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    if (cachedUser === undefined) void loadUser();
    return () => { listeners.delete(l); };
  }, []);
  const refresh = useCallback(async () => { await loadUser(); }, []);
  const signout = useCallback(async () => {
    try { await authApi.signout(); } catch { /* still clear locally */ }
    cachedUser = null;
    notify();
  }, []);
  return { user: cachedUser ?? null, loading: cachedUser === undefined, refresh, signout };
}

/** Mark the cached user as signed in (call after signin/signup success). */
export function setSignedInUser(user: AuthUser): void {
  cachedUser = user;
  notify();
}
