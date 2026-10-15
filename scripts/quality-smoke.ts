import { parsePlayerEvent, PLAYER_ORIGIN } from '../src/lib/playerEvents';
import { withResumeAt, movieEmbedUrl, tvEmbedUrl } from '../src/lib/vidapi';
import { formatClock } from '../src/lib/utils';
import { IFRAME_SANDBOX, FORBIDDEN_SANDBOX_TOKENS } from '../src/lib/playerSecurity';

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', name); }
}
function msg(type: string, data: unknown, origin = PLAYER_ORIGIN) {
  return { origin, data: { type, data } } as unknown as MessageEvent;
}
const goodData = {
  player_info: { imdb: 'tt123', tmdb: null, mediaType: 'movie', season: null, episode: null, title: 'T' },
  player_status: 'playing',
  player_progress: 125.4,
  player_duration: 7200,
  quality: { label: '1080p', width: 1920, height: 1080 },
  availableQualities: ['1080p', '720p', '480p', '360p'],
};

// --- parsePlayerEvent ---
const good = parsePlayerEvent(msg('PLAYER_EVENT', goodData));
ok('accepts valid event', good !== null);
ok('parses quality label', good?.quality?.label === '1080p');
ok('parses quality dims', good?.quality?.width === 1920 && good?.quality?.height === 1080);
ok('parses availableQualities', good?.availableQualities.join(',') === '1080p,720p,480p,360p');
ok('parses progress/duration', good?.progress === 125.4 && good?.duration === 7200);
ok('parses imdb', good?.info.imdb === 'tt123');

ok('rejects wrong origin', parsePlayerEvent(msg('PLAYER_EVENT', goodData, 'https://evil.com')) === null);
ok('rejects wrong type', parsePlayerEvent(msg('OTHER', goodData)) === null);
ok('rejects bad status', parsePlayerEvent(msg('PLAYER_EVENT', { ...goodData, player_status: 'buffering' })) === null);
ok('rejects non-object data', parsePlayerEvent({ origin: PLAYER_ORIGIN, data: 'nope' } as unknown as MessageEvent) === null);
const noQ = parsePlayerEvent(msg('PLAYER_EVENT', { ...goodData, quality: null, availableQualities: 'x' }));
ok('tolerates missing quality', noQ !== null && noQ.quality === null && noQ.availableQualities.length === 0);
const tvData = { ...goodData, player_info: { imdb: null, tmdb: '1399', mediaType: 'tv', season: 1, episode: 2, title: 'S' } };
const tv = parsePlayerEvent(msg('PLAYER_EVENT', tvData));
ok('parses tv info', tv?.info.tmdb === '1399' && tv?.info.season === 1 && tv?.info.episode === 2);

// --- withResumeAt ---
const base = movieEmbedUrl(1, 'tt123');
ok('resumeAt appended', withResumeAt(base, 300).includes('resumeAt=300'));
ok('resumeAt keeps quality param', withResumeAt(base, 300).includes('quality=highest'));
ok('resumeAt floors', withResumeAt(base, 300.9).includes('resumeAt=300'));
ok('resumeAt ignores tiny', withResumeAt(base, 2) === base);
ok('resumeAt ignores zero', withResumeAt(base, 0) === base);
const tvBase = tvEmbedUrl(1, 2, 3, 'tt456');
ok('tv resumeAt', withResumeAt(tvBase, 61).includes('resumeAt=61'));

// --- formatClock ---
ok('clock m:ss', formatClock(65) === '1:05');
ok('clock h:mm:ss', formatClock(3725) === '1:02:05');
ok('clock zero', formatClock(0) === '0:00');

// --- iframe sandbox (ad-redirect hardening) ---
const tokens = IFRAME_SANDBOX.split(/\s+/);
ok('sandbox allows scripts (player needs JS)', tokens.includes('allow-scripts'));
ok('sandbox keeps real origin (player storage + postMessage checks)', tokens.includes('allow-same-origin'));
for (const bad of FORBIDDEN_SANDBOX_TOKENS) {
  ok(`sandbox forbids ${bad}`, !tokens.includes(bad));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
