// Privacy-conscious analytics reporter.
// - Random per-visit session id stored in sessionStorage (reset when the tab closes)
// - No IP addresses, user agents, or fingerprints are collected client-side;
//   the server stores only the event payload (see api/track.ts).
// - Fail-silent: tracking never breaks the site or spams errors.
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    try {
      sessionId = sessionStorage.getItem('mm_sid');
    } catch {
      sessionId = null;
    }
    if (!sessionId) {
      sessionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      try {
        sessionStorage.setItem('mm_sid', sessionId);
      } catch {
        /* storage unavailable — keep the in-memory id */
      }
    }
  }
  return sessionId;
}

export interface TrackData {
  tmdb_id?: number;
  media_type?: 'movie' | 'tv';
  meta?: Record<string, unknown>;
}

export function trackEvent(event_type: string, data: TrackData = {}): void {
  try {
    const body = JSON.stringify({
      event_type,
      session_id: getSessionId(),
      tmdb_id: data.tmdb_id,
      media_type: data.media_type,
      meta: data.meta ?? {},
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* never break the site for analytics */
  }
}
