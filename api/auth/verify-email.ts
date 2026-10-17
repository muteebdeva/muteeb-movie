// POST /api/auth/verify-email — thin proxy to the shared auth backend.
// Copy into your frontend repo's api/auth/ directory (with _proxy.ts).
import { proxyAuth, type ProxyRequest, type ProxyResponse } from './_proxy.js';

export default async function handler(req: ProxyRequest, res: ProxyResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST')
      .setHeader('Content-Type', 'application/json')
      .send(JSON.stringify({ ok: false, code: 'method_not_allowed', message: 'Method not allowed' }));
    return;
  }
  await proxyAuth(req, res, '/api/auth/verify-email');
}
