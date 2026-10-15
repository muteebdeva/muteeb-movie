export function formatRuntime(minutes: number | undefined): string {
  if (!minutes) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDate(date: string | undefined | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatYear(date: string | undefined | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return String(d.getFullYear());
}

export function getTitle(item: {
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
}): string {
  return item.title || item.name || item.original_title || item.original_name || 'Untitled';
}

export function getMediaType(item: {
  media_type?: string;
  title?: string;
  name?: string;
  first_air_date?: string;
}): 'movie' | 'tv' {
  if (item.media_type === 'movie' || item.media_type === 'tv') return item.media_type;
  if (item.first_air_date || item.name) return 'tv';
  return 'movie';
}

export function getReleaseDate(item: {
  release_date?: string;
  first_air_date?: string;
}): string | null {
  return item.release_date || item.first_air_date || null;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

export function ratingColor(rating: number): string {
  if (rating >= 7.5) return 'text-green-400';
  if (rating >= 6) return 'text-yellow-400';
  if (rating >= 4) return 'text-orange-400';
  return 'text-red-400';
}

/** Format seconds as H:MM:SS or M:SS for resume labels. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}
