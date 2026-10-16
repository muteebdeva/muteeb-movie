import type { ApiResponse } from './types.js';
import { DbNotConfiguredError, SbError } from './supabase.js';
import { AuthError } from './auth.js';
import { ValidationError } from './validate.js';

function send(res: ApiResponse, status: number, body: unknown): void {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export const ok = (res: ApiResponse, data: unknown = null) =>
  send(res, 200, { ok: true, data });

export const created = (res: ApiResponse, data: unknown = null) =>
  send(res, 201, { ok: true, data });

export const noContent = (res: ApiResponse) => {
  res.status(204).send('');
};

export function methodNotAllowed(res: ApiResponse, allow: string[]): void {
  res.setHeader('Allow', allow.join(', '));
  send(res, 405, { ok: false, code: 'method_not_allowed', message: 'Method not allowed' });
}

/** Map known errors to safe public shapes. Never leaks stack traces or SQL. */
export function handleApiError(res: ApiResponse, err: unknown): void {
  if (err instanceof ValidationError) {
    send(res, 400, { ok: false, code: 'validation', message: err.message });
    return;
  }
  if (err instanceof AuthError) {
    send(res, err.status, { ok: false, code: 'auth', message: err.message });
    return;
  }
  if (err instanceof DbNotConfiguredError) {
    send(res, 503, {
      ok: false,
      code: 'db_not_configured',
      message:
        'Admin backend is not configured. See docs/admin/SETUP.md for the Supabase setup steps.',
    });
    return;
  }
  if (err instanceof SbError) {
    // 400 from PostgREST usually means our query was malformed (a bug);
    // surface a generic message rather than raw SQL text.
    console.error('[api] supabase error:', err.message);
    send(res, 502, { ok: false, code: 'database_error', message: 'Database request failed.' });
    return;
  }
  console.error('[api] unexpected error:', err);
  send(res, 500, { ok: false, code: 'internal', message: 'Unexpected server error.' });
}
