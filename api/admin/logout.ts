// POST /api/admin/logout — clears the session cookie. Idempotent.
import { clearSessionCookieHeader } from '../_lib/auth.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import type { Handler } from '../_lib/types.js';

const handler: Handler = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    ok(res, { logged_out: true });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
