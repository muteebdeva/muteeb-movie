// Minimal Supabase client over plain fetch — no dependencies.
// Server-side only: uses the service_role key, which bypasses RLS and must
// NEVER be exposed to browsers (it is not VITE_-prefixed, so Vite won't bundle it).
import type { ApiResponse } from './types.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class DbNotConfiguredError extends Error {
  constructor() {
    super(
      'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
    this.name = 'DbNotConfiguredError';
  }
}

export class SbError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`Supabase error ${status}: ${message}`.slice(0, 300));
    this.name = 'SbError';
    this.status = status;
  }
}

export function isDbConfigured(): boolean {
  return !!SUPABASE_URL && !!SERVICE_KEY;
}

function requireDb() {
  if (!isDbConfigured()) throw new DbNotConfiguredError();
  return { url: SUPABASE_URL as string, key: SERVICE_KEY as string };
}

interface SbOptions {
  query?: string;
  body?: unknown;
  /** e.g. 'return=representation' | 'return=minimal' | 'resolution=merge-duplicates' */
  prefer?: string;
}

async function sbRequest(
  method: string,
  path: string,
  opts: SbOptions = {}
): Promise<unknown> {
  const { url, key } = requireDb();
  const full = `${url}/rest/v1${path}${opts.query ? `?${opts.query}` : ''}`;
  const res = await fetch(full, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer ?? 'return=representation',
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SbError(res.status, text || res.statusText);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const q = (params: Record<string, string | number | boolean>): string =>
  new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();

/** Exact row count via PostgREST `Prefer: count=exact` (reads Content-Range). */
export async function sbCount(
  table: string,
  params: Record<string, string | number | boolean> = {}
): Promise<number> {
  const { url, key } = requireDb();
  const res = await fetch(`${url}/rest/v1/${table}?${q({ select: 'id', ...params })}`, {
    method: 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SbError(res.status, text || res.statusText);
  }
  await res.text().catch(() => {});
  const range = res.headers.get('content-range'); // "0-0/42"
  const m = range && /\/(\d+)\s*$/.exec(range);
  return m ? parseInt(m[1], 10) : 0;
}

export const sb = {
  get: (table: string, params: Record<string, string | number | boolean> = {}) =>
    sbRequest('GET', `/${table}`, { query: q({ select: '*', ...params }) }) as Promise<
      Record<string, unknown>[]
    >,
  insert: (table: string, rows: Record<string, unknown> | Record<string, unknown>[]) =>
    sbRequest('POST', `/${table}`, { body: rows }) as Promise<Record<string, unknown>[]>,
  upsert: (
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    onConflict: string
  ) =>
    sbRequest('POST', `/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      body: rows,
      prefer: 'resolution=merge-duplicates,return=representation',
    }) as Promise<Record<string, unknown>[]>,
  update: (
    table: string,
    params: Record<string, string | number | boolean>,
    patch: Record<string, unknown>
  ) =>
    sbRequest('PATCH', `/${table}`, {
      query: q(params),
      body: patch,
    }) as Promise<Record<string, unknown>[]>,
  del: (table: string, params: Record<string, string | number | boolean>) =>
    sbRequest('DELETE', `/${table}`, {
      query: q(params),
      prefer: 'return=minimal',
    }) as Promise<null>,
};

/** GoTrue Auth admin API (service_role) — used for the login exchange. */
export async function goTrueToken(
  email: string,
  password: string
): Promise<{ access_token: string; user: { id: string; email?: string } }> {
  const { url, key } = requireDb();
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SbError(res.status, text.slice(0, 200) || 'Invalid credentials');
  }
  return (await res.json()) as {
    access_token: string;
    user: { id: string; email?: string };
  };
}

export function sendDbNotConfigured(res: ApiResponse): void {
  res
    .status(503)
    .setHeader('Content-Type', 'application/json')
    .send(
      JSON.stringify({
        ok: false,
        code: 'db_not_configured',
        message:
          'Admin backend is not configured. Create a Supabase project, run db/migrations/001_admin_schema.sql, and set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_JWT_SECRET. See docs/admin/SETUP.md.',
      })
    );
}
