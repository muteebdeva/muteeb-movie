import type { ApiResponse } from './types.js';
import { ValidationError } from './validate.js';

function send(res: ApiResponse, status: number, body: unknown): void {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

export const ok = (res: ApiResponse, data: unknown = null) =>
  send(res, 200, { ok: true, data });

export function methodNotAllowed(res: ApiResponse, allow: string[]): void {
  res.setHeader('Allow', allow.join(', '));
  send(res, 405, { ok: false, code: 'method_not_allowed', message: 'Method not allowed' });
}

/** Map known errors to safe public shapes. Never leaks stack traces. */
export function handleApiError(res: ApiResponse, err: unknown): void {
  if (err instanceof ValidationError) {
    send(res, 400, { ok: false, code: 'validation', message: err.message });
    return;
  }
  console.error('[api] unexpected error:', err);
  send(res, 500, { ok: false, code: 'internal', message: 'Unexpected server error.' });
}
