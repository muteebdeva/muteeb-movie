// Auth client for the movie site, backed by Supabase Auth.
// Sessions are managed by @supabase/supabase-js (auto-refresh); the profile
// (display name, role) comes from public.profiles via RLS (own row only).

import { useCallback, useEffect, useState } from 'react';
import { supabase, activeSupabase, isSupabaseConfigured } from './supabase';
import type { SupabaseClient, User } from '@supabase/supabase-js';

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

function supaError(e: unknown, fallbackCode = 'unknown'): never {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.toLowerCase();
  let code = fallbackCode;
  if (m.includes('invalid login credentials')) code = 'invalid_credentials';
  else if (m.includes('email not confirmed')) code = 'email_not_verified';
  else if (m.includes('user already registered')) code = 'email_in_use';
  else if (m.includes('password')) code = 'weak_password';
  else if (m.includes('rate limit') || m.includes('too many')) code = 'rate_limited';
  throw new AuthApiError(400, code, msg);
}

async function toAuthUser(client: SupabaseClient, user: User): Promise<AuthUser> {
  let displayName = '';
  let role = 'user';
  try {
    const { data } = await client
      .from('profiles')
      .select('display_name,role')
      .eq('id', user.id)
      .single();
    if (data) {
      displayName = (data.display_name as string) ?? '';
      const r = data.role as string | undefined;
      role = r === 'owner' || r === 'admin' || r === 'moderator' || r === 'analyst' ? r : 'user';
    }
  } catch {
    // profile row may not exist yet if the trigger hasn't run; fall back
  }
  if (!displayName) {
    displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Movie fan';
  }
  return {
    id: user.id,
    email: user.email ?? '',
    displayName,
    emailVerified: Boolean(user.email_confirmed_at),
    role,
  };
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new AuthApiError(503, 'auth_not_configured', 'Sign-in is not configured yet.');
  }
}

export const authApi = {
  me: async (): Promise<{ user: AuthUser }> => {
    ensureConfigured();
    const client = await activeSupabase();
    if (!client) throw new AuthApiError(401, 'not_signed_in', 'Not signed in.');
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new AuthApiError(401, 'not_signed_in', 'Not signed in.');
    return { user: await toAuthUser(client, data.user) };
  },

  signin: async (
    email: string,
    password: string,
    remember: boolean,
  ): Promise<{ user: AuthUser }> => {
    ensureConfigured();
    const client = supabase(remember);
    // Make sure a stale session in the other storage doesn't linger.
    await supabase(!remember).auth.signOut().catch(() => {});
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.user) supaError(error ?? new Error('Sign-in failed.'));
    return { user: await toAuthUser(client, data.user as User) };
  },

  signup: async (
    displayName: string,
    email: string,
    password: string,
  ): Promise<{ user: AuthUser | null; needsConfirmation: boolean }> => {
    ensureConfigured();
    const client = supabase(true);
    const site = window.location.origin;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${site}/#/verify-email`,
      },
    });
    if (error || !data.user) supaError(error ?? new Error('Sign-up failed.'));
    // No session => email confirmation is required before first sign-in.
    if (!data.session) return { user: null, needsConfirmation: true };
    return { user: await toAuthUser(client, data.user as User), needsConfirmation: false };
  },

  signout: async (): Promise<{ signedOut: boolean }> => {
    ensureConfigured();
    await supabase(true).auth.signOut().catch(() => {});
    await supabase(false).auth.signOut().catch(() => {});
    return { signedOut: true };
  },

  resendVerification: async (email: string): Promise<void> => {
    ensureConfigured();
    const { error } = await supabase(true).auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/#/verify-email` },
    });
    if (error) supaError(error);
  },

  requestReset: async (email: string): Promise<{ message: string }> => {
    ensureConfigured();
    const { error } = await supabase(true).auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) supaError(error);
    // Always respond generically so we don't reveal which emails are registered.
    return { message: 'If an account exists for that email, a reset link is on its way.' };
  },

  /** Sets the new password using the recovery session from the reset link. */
  resetPassword: async (password: string): Promise<void> => {
    ensureConfigured();
    // The persistent client consumed the recovery tokens from the URL on load.
    const client = supabase(true);
    const { data } = await client.auth.getSession();
    if (!data.session) {
      throw new AuthApiError(400, 'invalid_token', 'This reset link is invalid or has expired.');
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) supaError(error);
  },
};

/** Friendly messages for auth error codes. */
export function authErrorMessage(e: unknown): string {
  if (e instanceof AuthApiError) {
    switch (e.code) {
      case 'invalid_credentials': return 'Incorrect email or password.';
      case 'email_in_use': return 'An account with this email already exists. Try signing in.';
      case 'email_not_verified': return 'Please verify your email address before signing in. Check your inbox for the confirmation link.';
      case 'invalid_token': return 'This link is invalid or has expired.';
      case 'weak_password': return e.message;
      case 'rate_limited': return 'Too many attempts. Please wait a moment and try again.';
      case 'auth_not_configured': return 'Sign-in is not configured yet. Please try again later.';
      case 'not_signed_in': return 'You are not signed in.';
      default: return e.message || 'Something went wrong. Please try again.';
    }
  }
  if (e instanceof Error) return e.message;
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

let subscribed = false;
function ensureSubscribed(): void {
  if (subscribed || !isSupabaseConfigured()) return;
  subscribed = true;
  for (const persistent of [true, false]) {
    supabase(persistent).auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const c = supabase(persistent);
        void toAuthUser(c, session.user).then((u) => { cachedUser = u; notify(); });
      } else {
        // Only clear if neither client has a session.
        void activeSupabase().then((c) => { if (!c) { cachedUser = null; notify(); } });
      }
    });
  }
}

/** Global auth state hook — session comes from Supabase (auto-refresh). */
export function useAuth(): AuthState {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    ensureSubscribed();
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
