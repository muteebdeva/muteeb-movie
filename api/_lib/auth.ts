// Admin session handling.
// Flow: POST /api/admin/login exchanges email+password via Supabase GoTrue,
// verifies the user is on the admin_users allowlist, and sets an httpOnly
// session cookie holding the Supabase access JWT. Every privileged route
// calls requireAdmin(), which verifies the JWT signature (HS256, node:crypto
// — no dependencies) and re-checks the allowlist server-side.
//
// CSRF: admin mutations require a matching Origin/Referer (assertSameOrigin).
// The cookie is SameSite=Lax + Secure + httpOnly.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sb, DbNotConfiguredError } from './supabase.js';
import { header, type ApiRequest } from './types.js';

export const SESSION_COOKIE = 'mm_admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export interface AdminIdentity {
  id: string;
  email: string;
  display_name: string | null;
}

function b64urlDecode(s: string): Buffer {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(norm + '='.repeat((4 - (norm.length % 4)) % 4), 'base64');
}

export interface JwtPayload {
  sub: string;
  email?: string;
  exp?: number;
}

/** Verify a Supabase GoTrue JWT (HS256) using SUPABASE_JWT_SECRET. */
export function verifyJwt(token: string): JwtPayload {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new AuthError('Server misconfigured: SUPABASE_JWT_SECRET missing', 500);
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('Malformed session token');
  const [h, p, sig] = parts;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
    actual = b64urlDecode(sig);
  } catch {
    throw new AuthError('Malformed session token');
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AuthError('Invalid session signature');
  }
  let payload: JwtPayload;
  try {
    payload = JSON.parse(b64urlDecode(p).toString('utf8')) as JwtPayload;
  } catch {
    throw new AuthError('Malformed session payload');
  }
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    throw new AuthError('Session expired');
  }
  if (!payload.sub) throw new AuthError('Session has no subject');
  return payload;
}

function readSessionCookie(req: ApiRequest): string | undefined {
  const raw = header(req.headers, 'cookie');
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** Authenticate the request and return the allowlisted admin. Throws 401/403. */
export async function requireAdmin(req: ApiRequest): Promise<AdminIdentity> {
  const token = readSessionCookie(req);
  if (!token) throw new AuthError('Not signed in');
  const payload = verifyJwt(token);
  let rows: Record<string, unknown>[];
  try {
    rows = await sb.get('admin_users', { id: `eq.${payload.sub}`, select: 'id,email,display_name' });
  } catch (e) {
    if (e instanceof DbNotConfiguredError) throw new AuthError('Admin backend not configured', 503);
    throw e;
  }
  const admin = rows[0] as unknown as AdminIdentity | undefined;
  if (!admin) throw new AuthError('Account is not an administrator', 403);
  return admin;
}

/** Best-effort CSRF guard for cookie-authed mutations: the request must carry
 *  an Origin (or Referer) whose host matches the request host. */
export function assertSameOrigin(req: ApiRequest): void {
  const origin = header(req.headers, 'origin') ?? header(req.headers, 'referer');
  if (!origin) throw new AuthError('Missing origin', 403);
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AuthError('Bad origin', 403);
  }
  const host =
    header(req.headers, 'x-forwarded-host') ?? header(req.headers, 'host') ?? '';
  const hostOnly = host.split(',')[0].trim();
  if (originHost !== hostOnly) throw new AuthError('Cross-origin request refused', 403);
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.VERCEL === '1' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---------------------------------------------------------------------------
// Best-effort per-instance login rate limiting (serverless instances don't
// share memory — this blunts single-instance brute force; Supabase Auth also
// rate-limits upstream). Documented in docs/admin/SETUP.md.
// ---------------------------------------------------------------------------
const attempts = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

export function checkLoginRateLimit(ip: string): void {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_ATTEMPTS) {
    throw new AuthError('Too many login attempts. Try again later.', 429);
  }
  list.push(now);
  attempts.set(ip, list);
  if (attempts.size > 1000) attempts.clear();
}

export function clientIp(req: ApiRequest): string {
  const fwd = header(req.headers, 'x-forwarded-for');
  return (fwd ?? '').split(',')[0].trim() || 'unknown';
}
