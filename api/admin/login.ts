// POST /api/admin/login { email, password }
// Exchanges credentials via Supabase GoTrue, checks the admin_users
// allowlist, and sets an httpOnly session cookie. Never reveals whether the
// email exists: bad credentials always return the same 401.
import { goTrueToken, sb, SbError, DbNotConfiguredError } from '../_lib/supabase.js';
import {
  sessionCookieHeader,
  checkLoginRateLimit,
  clientIp,
  AuthError,
} from '../_lib/auth.js';
import { audit } from '../_lib/audit.js';
import { ok, methodNotAllowed, handleApiError } from '../_lib/respond.js';
import { asRecord, vEmail, vStr } from '../_lib/validate.js';
import type { Handler } from '../_lib/types.js';

const handler: Handler = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    checkLoginRateLimit(clientIp(req));
    const body = asRecord(req.body);
    const email = vEmail(body.email);
    const password = vStr(body.password, { required: true, max: 256, name: 'password' }) as string;

    let token: { access_token: string; user: { id: string; email?: string } };
    try {
      token = await goTrueToken(email, password);
    } catch (e) {
      if (e instanceof SbError || e instanceof DbNotConfiguredError) {
        // GoTrue 400 on bad credentials — normalize to a generic 401.
        throw new AuthError('Invalid email or password', 401);
      }
      throw e;
    }

    // Allowlist check: the user must be registered as an admin.
    const rows = await sb.get('admin_users', {
      id: `eq.${token.user.id}`,
      select: 'id,email,display_name',
    });
    const admin = (rows as unknown as { id: string; email: string; display_name: string | null }[])[0];
    if (!admin) throw new AuthError('Invalid email or password', 401);

    res.setHeader('Set-Cookie', sessionCookieHeader(token.access_token));
    await audit(admin, 'auth.login', 'admin_users', admin.id, {});
    ok(res, { email: admin.email, display_name: admin.display_name });
  } catch (e) {
    handleApiError(res, e);
  }
};

export default handler;
