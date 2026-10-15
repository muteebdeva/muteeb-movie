/**
 * VidAPI player events (documented at vidapi.ru/api, "Player Events").
 *
 * The embed iframe posts a single PLAYER_EVENT message to the parent window.
 * Every event carries the current playback status, progress, duration, the
 * ACTUAL current rendition and the list of renditions the source offers.
 * There is no documented parent->player message for *setting* quality, so
 * quality is read-only from our side: we display what the player reports
 * and never invent a switcher.
 */

export const PLAYER_ORIGIN = 'https://vaplayer.ru';

export type PlayerStatus = 'playing' | 'paused' | 'completed' | 'seeked';

export interface PlayerQuality {
  label: string;
  width: number;
  height: number;
}

export interface PlayerEventInfo {
  imdb: string | null;
  tmdb: string | null;
  mediaType: 'movie' | 'tv' | null;
  season: number | null;
  episode: number | null;
  title: string | null;
}

export interface PlayerEventData {
  info: PlayerEventInfo;
  status: PlayerStatus;
  /** current playback position, seconds */
  progress: number;
  /** total duration, seconds */
  duration: number;
  /** the rendition actually playing right now (null until the player reports it) */
  quality: PlayerQuality | null;
  /** renditions the current source genuinely offers, e.g. ["1080p","720p","480p"] */
  availableQualities: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/**
 * Validate an incoming postMessage against the documented PLAYER_EVENT shape.
 * Returns null for anything else — including messages from other origins.
 */
export function parsePlayerEvent(event: MessageEvent): PlayerEventData | null {
  if (event.origin !== PLAYER_ORIGIN) return null;
  const outer: unknown = event.data;
  if (!isRecord(outer) || outer.type !== 'PLAYER_EVENT') return null;
  const data: unknown = outer.data;
  if (!isRecord(data)) return null;

  const status = data.player_status;
  if (status !== 'playing' && status !== 'paused' && status !== 'completed' && status !== 'seeked') {
    return null;
  }

  const progress = asNumber(data.player_progress);
  const duration = asNumber(data.player_duration);
  if (progress == null || duration == null) return null;

  const infoRaw: unknown = data.player_info;
  const info: PlayerEventInfo = {
    imdb: isRecord(infoRaw) ? asString(infoRaw.imdb) : null,
    tmdb: isRecord(infoRaw)
      ? (infoRaw.tmdb == null ? null : String(infoRaw.tmdb))
      : null,
    mediaType: isRecord(infoRaw) && (infoRaw.mediaType === 'movie' || infoRaw.mediaType === 'tv')
      ? infoRaw.mediaType
      : null,
    season: isRecord(infoRaw) ? asNumber(infoRaw.season) : null,
    episode: isRecord(infoRaw) ? asNumber(infoRaw.episode) : null,
    title: isRecord(infoRaw) ? asString(infoRaw.title) : null,
  };

  let quality: PlayerQuality | null = null;
  const qRaw: unknown = data.quality;
  if (isRecord(qRaw)) {
    const label = asString(qRaw.label);
    const width = asNumber(qRaw.width);
    const height = asNumber(qRaw.height);
    if (label && width != null && height != null) {
      quality = { label, width, height };
    }
  }

  const aqRaw: unknown = data.availableQualities;
  const availableQualities = Array.isArray(aqRaw)
    ? aqRaw.filter((q): q is string => typeof q === 'string')
    : [];

  return { info, status, progress, duration, quality, availableQualities };
}
