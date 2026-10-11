import type { Genre, MediaDetails, MediaType, Movie, SearchResult } from '@/types';

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const API_KEY =
  (import.meta.env.VITE_TMDB_API_KEY as string | undefined) ||
  'bd16028b4c61160adf9485bf805087ce';

async function tmdbFetch<T>(path: string, extraParams?: URLSearchParams): Promise<T> {
  const params = extraParams ?? new URLSearchParams();
  if (API_KEY) params.set('api_key', API_KEY);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const url = `${API_BASE}${path}?${params.toString()}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function isConfigured(): boolean {
  return !!API_KEY;
}

export function imgUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '';
  return `${IMG_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null, size: string = 'original'): string {
  if (!path) return '';
  return `${IMG_BASE}/${size}${path}`;
}

export async function getTrending(
  mediaType: 'all' | 'movie' | 'tv' = 'all',
  timeWindow: 'day' | 'week' = 'week'
): Promise<Movie[]> {
  const data = await tmdbFetch<{ results: Movie[] }>(`/trending/${mediaType}/${timeWindow}`);
  return data.results as Movie[];
}

export async function getPopularMovies(page = 1): Promise<SearchResult> {
  return tmdbFetch<SearchResult>('/movie/popular', new URLSearchParams({ page: String(page) }));
}

export async function getTopRatedMovies(page = 1): Promise<SearchResult> {
  return tmdbFetch<SearchResult>('/movie/top_rated', new URLSearchParams({ page: String(page) }));
}

export async function getUpcomingMovies(page = 1): Promise<SearchResult> {
  return tmdbFetch<SearchResult>('/movie/upcoming', new URLSearchParams({ page: String(page) }));
}

export async function getPopularTV(page = 1): Promise<SearchResult> {
  return tmdbFetch<SearchResult>('/tv/popular', new URLSearchParams({ page: String(page) }));
}

export async function getTopRatedTV(page = 1): Promise<SearchResult> {
  return tmdbFetch<SearchResult>('/tv/top_rated', new URLSearchParams({ page: String(page) }));
}

export async function getAiringTodayTV(page = 1): Promise<SearchResult> {
  return tmdbFetch<SearchResult>('/tv/airing_today', new URLSearchParams({ page: String(page) }));
}

export async function searchMulti(query: string, page = 1): Promise<SearchResult> {
  const params = new URLSearchParams({ query, page: String(page), include_adult: 'false' });
  return tmdbFetch<SearchResult>('/search/multi', params);
}

export async function getDetails(
  mediaType: MediaType,
  id: number
): Promise<MediaDetails> {
  const params = new URLSearchParams({
    append_to_response: 'credits,videos,similar,recommendations,images,external_ids',
    include_image_language: 'en,null',
  });
  return tmdbFetch<MediaDetails>(`/${mediaType}/${id}`, params);
}

export async function getSeason(
  tvId: number,
  seasonNumber: number
): Promise<{
  episodes: import('@/types').Episode[];
  season_number: number;
  name: string;
  overview: string;
}> {
  return tmdbFetch<{
    episodes: import('@/types').Episode[];
    season_number: number;
    name: string;
    overview: string;
  }>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getGenres(): Promise<{ movie: Genre[]; tv: Genre[] }> {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbFetch<{ genres: Genre[] }>('/genre/movie/list'),
    tmdbFetch<{ genres: Genre[] }>('/genre/tv/list'),
  ]);
  return { movie: movieGenres.genres, tv: tvGenres.genres };
}

export async function discoverByGenre(
  mediaType: MediaType,
  genreId: number,
  page = 1
): Promise<SearchResult> {
  const params = new URLSearchParams({
    with_genres: String(genreId),
    page: String(page),
    sort_by: 'popularity.desc',
  });
  return tmdbFetch<SearchResult>(`/discover/${mediaType}`, params);
}
