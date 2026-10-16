// GET /api/admin/me — returns the signed-in admin's profile, or 401/403.
import { requireAdmin } from '../_lib/auth.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import type { Handler } from '../_lib/types.js';

const handler: Handler = async (req, res) => {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const admin = await requireAdmin(req);
    ok(res, admin);
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
