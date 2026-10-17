// Shared proxy helper — copy this file along with the route files into your
// frontend repo's api/auth/ directory. Forwards to the auth backend and keeps
// the session cookie first-party on YOUR domain.
export interface ProxyRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ProxyResponse {
  status(code: number): ProxyResponse;
  setHeader(name: string, value: string | string[]): ProxyResponse;
  send(body: unknown): void;
}

function first(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const v = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(v) ? v[0] : v;
}

function readCookie(headers: Record<string, string | string[] | undefined>, name: string): string | null {
  const c = first(headers, 'cookie');
  if (!c) return null;
  for (const part of c.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function isHttps(headers: Record<string, string | string[] | undefined>): boolean {
  return first(headers, 'x-forwarded-proto') === 'https' || process.env.VERCEL_ENV === 'production';
}

function sessionCookie(token: string, maxAgeSec: number, headers: ProxyRequest['headers']): string {
  let c = `mp_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
  if (isHttps(headers)) c += '; Secure';
  return c;
}

function clearCookie(headers: ProxyRequest['headers']): string {
  let c = 'mp_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
  if (isHttps(headers)) c += '; Secure';
  return c;
}

export interface ProxyOptions {
  /** Set the session cookie from data.session.token in the backend response. */
  login?: boolean;
  /** Clear the session cookie. */
  logout?: boolean;
}

/**
 * Forward the request to the auth backend and relay the JSON response.
 * The backend never sets cookies itself; this proxy owns the first-party
 * mp_session cookie for the frontend's domain.
 */
export async function proxyAuth(
  req: ProxyRequest,
  res: ProxyResponse,
  backendPath: string,
  opts: ProxyOptions = {}
): Promise<void> {
  const base = (process.env.AUTH_BACKEND_URL ?? '').replace(/\/$/, '');
  if (!base) {
    res.status(503).setHeader('Content-Type', 'application/json')
      .send(JSON.stringify({ ok: false, code: 'auth_not_configured', message: 'Authentication is not configured.' }));
    return;
  }
  const sessionToken = readCookie(req.headers, 'mp_session');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(base + backendPath, {
      method: req.method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...(first(req.headers, 'x-forwarded-for') ? { 'x-forwarded-for': first(req.headers, 'x-forwarded-for')! } : {}),
      },
      body: req.method === 'GET' || req.method === 'HEAD' || req.body == null
        ? undefined
        : JSON.stringify(req.body),
    });
    const text = await upstream.text();
    let data: { ok?: boolean; data?: { session?: { token?: string; expiresAt?: string } } } | null = null;
    try { data = text ? JSON.parse(text) as typeof data : null; } catch { /* passthrough */ }

    if (opts.login && upstream.ok && data?.ok && data?.data?.session?.token) {
      const expiresAt = new Date(data.data.session.expiresAt).getTime();
      const maxAge = Math.max(60, Math.floor((expiresAt - Date.now()) / 1000));
      res.setHeader('Set-Cookie', sessionCookie(data.data.session.token, maxAge, req.headers));
    }
    if (opts.logout) {
      res.setHeader('Set-Cookie', clearCookie(req.headers));
    }
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text);
  } catch {
    res.status(502).setHeader('Content-Type', 'application/json')
      .send(JSON.stringify({ ok: false, code: 'auth_unreachable', message: 'Authentication service is unreachable.' }));
  } finally {
    clearTimeout(timer);
  }
}
