// Admin backend smoke tests: validators, JWT auth, CSRF guard, analytics
// aggregation. Pure logic only — no network, no database.
import { createHmac } from 'node:crypto';
import {
  vStr, vInt, vBool, vOneOf, vMediaType, vEmail, ValidationError,
} from '../api/_lib/validate.js';
import { verifyJwt, assertSameOrigin, AuthError } from '../api/_lib/auth.js';
import { aggregateAnalytics } from '../api/admin/analytics.js';
import type { ApiRequest } from '../api/_lib/types.js';

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}
function throws(name: string, fn: () => void, cls: new (...a: never[]) => Error = ValidationError) {
  try { fn(); ok(name, false); }
  catch (e) { ok(name, e instanceof cls); }
}

// --- validators ---
ok('vStr trims', vStr('  hi  ', { required: true }) === 'hi');
ok('vStr optional empty -> null', vStr('', {}) === null);
throws('vStr required empty', () => vStr('   ', { required: true }));
throws('vStr max', () => vStr('abcdef', { max: 5 }));
throws('vStr wrong type', () => vStr(42 as unknown as string, { required: true }));
ok('vInt parses', vInt('42', { min: 1, max: 100 }) === 42);
ok('vInt optional -> null', vInt(undefined, {}) === null);
throws('vInt float', () => vInt(4.5, {}));
throws('vInt below min', () => vInt(0, { min: 1 }));
throws('vInt above max', () => vInt(101, { max: 100 }));
ok('vBool true', vBool(true) === true);
ok('vBool missing -> null', vBool(undefined) === null);
throws('vBool string', () => vBool('yes' as unknown as boolean));
ok('vOneOf ok', vOneOf('a', ['a', 'b'] as const) === 'a');
throws('vOneOf bad', () => vOneOf('z', ['a', 'b'] as const));
ok('vMediaType movie', vMediaType('movie') === 'movie');
ok('vMediaType missing -> null', vMediaType(undefined) === null);
throws('vMediaType invalid', () => vMediaType('book'));
ok('vEmail ok', vEmail('Admin@Example.com') === 'admin@example.com');
throws('vEmail bad', () => vEmail('not-an-email'));
throws('vEmail missing', () => vEmail(''));

// --- JWT ---
process.env.SUPABASE_JWT_SECRET = 'test-secret-for-smoke-only';
function sign(payload: Record<string, unknown>): string {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = createHmac('sha256', 'test-secret-for-smoke-only').update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
const future = Math.floor(Date.now() / 1000) + 3600;
const goodTok = sign({ sub: 'user-1', email: 'a@b.c', exp: future });
const parsed = verifyJwt(goodTok);
ok('jwt verifies', parsed.sub === 'user-1' && parsed.email === 'a@b.c');
throws('jwt tampered sig', () => verifyJwt(goodTok.slice(0, -2) + 'xx'), AuthError);
throws('jwt expired', () => verifyJwt(sign({ sub: 'u', exp: Math.floor(Date.now() / 1000) - 10 })), AuthError);
throws('jwt malformed', () => verifyJwt('not.a.jwt'), AuthError);
throws('jwt two parts', () => verifyJwt('a.b'), AuthError);
throws('jwt no sub', () => verifyJwt(sign({ exp: future })), AuthError);
delete process.env.SUPABASE_JWT_SECRET;
throws('jwt missing secret -> 500 AuthError', () => verifyJwt(goodTok), AuthError);
process.env.SUPABASE_JWT_SECRET = 'test-secret-for-smoke-only';

// --- CSRF guard ---
const req = (headers: Record<string, string>): ApiRequest =>
  ({ method: 'POST', headers, query: {} }) as ApiRequest;
ok('same origin passes', (() => {
  try {
    assertSameOrigin(req({ origin: 'https://muteeb-movie.vercel.app', 'x-forwarded-host': 'muteeb-movie.vercel.app' }));
    return true;
  } catch { return false; }
})());
throws('cross origin refused', () => assertSameOrigin(
  req({ origin: 'https://evil.com', 'x-forwarded-host': 'muteeb-movie.vercel.app' })
), AuthError);
throws('missing origin refused', () => assertSameOrigin(req({ 'x-forwarded-host': 'x' })), AuthError);
throws('bad origin refused', () => assertSameOrigin(req({ origin: '::not-a-url::' })), AuthError);
ok('referer fallback passes', (() => {
  try {
    assertSameOrigin(req({ referer: 'https://muteeb-movie.vercel.app/#/admin', host: 'muteeb-movie.vercel.app' }));
    return true;
  } catch { return false; }
})());

// --- analytics aggregation ---
const ev = (type: string, extra: Record<string, unknown> = {}) => ({
  event_type: type, tmdb_id: null, media_type: null, session_id: null,
  meta: {}, created_at: new Date().toISOString(), ...extra,
});
const empty = aggregateAnalytics([], 7, { movies: 0, tv: 0 });
ok('empty: no events', empty.totals.events === 0);
ok('empty: 7 day buckets', empty.timeseries.length === 7);
ok('empty: no top titles', empty.top_titles.length === 0);
ok('empty: no searches', empty.recent_searches.length === 0);

const mixed = aggregateAnalytics([
  ev('page_view', { session_id: 's1' }),
  ev('page_view', { session_id: 's1' }),
  ev('page_view', { session_id: 's2' }),
  ev('play_start', { tmdb_id: 11, media_type: 'movie', session_id: 's1' }),
  ev('play_start', { tmdb_id: 11, media_type: 'movie', session_id: 's2' }),
  ev('play_start', { tmdb_id: 22, media_type: 'tv', session_id: 's2' }),
  ev('title_open', { tmdb_id: 22, media_type: 'tv' }),
  ev('search', { meta: { query: 'dune', zero_results: false } }),
  ev('search', { meta: { query: 'xyzqq', zero_results: true } }),
  ev('play_error', { meta: { message: 'embed failed' } }),
], 7, { movies: 3, tv: 1 });
ok('mixed: event count', mixed.totals.events === 10);
ok('mixed: unique sessions', mixed.totals.unique_sessions === 2);
ok('mixed: by_type', mixed.totals.by_type.page_view === 3 && mixed.totals.by_type.play_start === 3);
ok('mixed: top title first', mixed.top_titles[0].tmdb_id === 11 && mixed.top_titles[0].plays === 2);
ok('mixed: opens counted', mixed.top_titles.find((t) => t.tmdb_id === 22)?.opens === 1);
ok('mixed: zero-result flagged', mixed.recent_searches.some((s) => s.zero_results && s.query === 'xyzqq'));
ok('mixed: error captured', mixed.recent_errors.length === 1 && mixed.recent_errors[0].detail === 'embed failed');
ok('mixed: curated counts', mixed.curated.movies === 3 && mixed.curated.tv === 1);
ok('mixed: timeseries sums', mixed.timeseries.reduce((n, d) => n + (Number(d.page_view ?? 0)), 0) === 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
