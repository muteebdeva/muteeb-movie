// Supabase client for the movie platform.
// Lazy-initialized so the app still builds/loads before env vars are set;
// calls throw a friendly error when configuration is missing.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

function buildClient(persistent: boolean): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) {
    throw new Error(
      'Sign-in is not configured yet (missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).',
    );
  }
  return createClient(url, key, {
    auth: {
      storage: persistent ? window.localStorage : window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Only the persistent client consumes magic/recovery links from the URL.
      detectSessionInUrl: persistent,
    },
  });
}

const clients: { persistent?: SupabaseClient; session?: SupabaseClient } = {};

/**
 * persistent=true  -> "Remember me": session survives browser restarts.
 * persistent=false -> session ends when the tab/browser closes.
 */
export function supabase(persistent = true): SupabaseClient {
  const slot = persistent ? 'persistent' : 'session';
  if (!clients[slot]) clients[slot] = buildClient(persistent);
  return clients[slot] as SupabaseClient;
}

/** The client that holds the current session, if any. */
export async function activeSupabase(): Promise<SupabaseClient | null> {
  for (const persistent of [false, true]) {
    try {
      const c = supabase(persistent);
      const { data } = await c.auth.getSession();
      if (data.session) return c;
    } catch {
      // not configured or no session here
    }
  }
  return null;
}
