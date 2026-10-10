import type { Genre, MediaDetails, MediaType, Movie, SearchResult } from '@/types';

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

function authParams(): URLSearchParams {
  const params = new URLSearchParams();
  if (API_KEY) {
    params.append('api_key', API_KEY);
  }
  return params;
}

function tmdbFetch(path: string, extraParams?: URLSearchParams): Promise<any> {
  const params = extraParams ?? new URLSearchParams();
  if (API_KEY) params.set('api_key', API_KEY);

  const url = `${API_BASE}${path}?${params.toString()}`;
  return fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  });
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
  const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}`);
  return data.results as Movie[];
}

export async function getPopularMovies(page = 1): Promise<SearchResult> {
  return tmdbFetch('/movie/popular', new URLSearchParams({ page: String(page) }));
}

export async function getTopRatedMovies(page = 1): Promise<SearchResult> {
  return tmdbFetch('/movie/top_rated', new URLSearchParams({ page: String(page) }));
}

export async function getUpcomingMovies(page = 1): Promise<SearchResult> {
  return tmdbFetch('/movie/upcoming', new URLSearchParams({ page: String(page) }));
}

export async function getPopularTV(page = 1): Promise<SearchResult> {
  return tmdbFetch('/tv/popular', new URLSearchParams({ page: String(page) }));
}

export async function getTopRatedTV(page = 1): Promise<SearchResult> {
  return tmdbFetch('/tv/top_rated', new URLSearchParams({ page: String(page) }));
}

export async function getAiringTodayTV(page = 1): Promise<SearchResult> {
  return tmdbFetch('/tv/airing_today', new URLSearchParams({ page: String(page) }));
}

export async function searchMulti(query: string, page = 1): Promise<SearchResult> {
  const params = new URLSearchParams({ query, page: String(page), include_adult: 'false' });
  return tmdbFetch('/search/multi', params);
}

export async function getDetails(
  mediaType: MediaType,
  id: number
): Promise<MediaDetails> {
  const params = new URLSearchParams({
    append_to_response: 'credits,videos,similar,recommendations,images,external_ids',
    include_image_language: 'en,null',
  });
  return tmdbFetch(`/${mediaType}/${id}`, params);
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
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getGenres(): Promise<{ movie: Genre[]; tv: Genre[] }> {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbFetch('/genre/movie/list'),
    tmdbFetch('/genre/tv/list'),
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
  return tmdbFetch(`/discover/${mediaType}`, params);
}
