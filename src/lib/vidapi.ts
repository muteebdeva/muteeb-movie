import type { MediaType } from '@/types';

const EMBED_BASE = 'https://vaplayer.ru/embed';

export function movieEmbedUrl(
  id: number,
  imdbId?: string | null
): string {
  if (imdbId) {
    return `${EMBED_BASE}/movie/${imdbId}?autoplay=1`;
  }
  return `${EMBED_BASE}/movie/${id}?autoplay=1`;
}

export function tvEmbedUrl(
  id: number,
  season: number,
  episode: number,
  imdbId?: string | null
): string {
  const sourceId = imdbId ?? String(id);
  return `${EMBED_BASE}/tv/${sourceId}/${season}/${episode}?autoplay=1`;
}

export function embedUrl(
  mediaType: MediaType,
  id: number,
  imdbId?: string | null,
  season?: number,
  episode?: number
): string {
  if (mediaType === 'movie') {
    return movieEmbedUrl(id, imdbId);
  }
  return tvEmbedUrl(id, season ?? 1, episode ?? 1, imdbId);
}
