import { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import type { Genre, Movie, WatchlistItem } from '@/types';
import { discoverMedia, getGenres, type DiscoverFilters } from '@/lib/tmdb';
import { useHashRoute, navigate } from '@/lib/router';
import { MovieCard } from '@/components/MovieCard';
import { Spinner, ErrorState } from '@/components/Spinner';
import { getTitle, getMediaType, formatYear, getReleaseDate } from '@/lib/utils';

interface BrowsePageProps {
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
}

const LANGUAGES = [
  { code: '', label: 'Any language' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
];

const SORTS: Record<'movie' | 'tv', { value: string; label: string }[]> = {
  movie: [
    { value: 'popularity.desc', label: 'Most popular' },
    { value: 'vote_average.desc', label: 'Highest rated' },
    { value: 'primary_release_date.desc', label: 'Newest' },
    { value: 'primary_release_date.asc', label: 'Oldest' },
    { value: 'title.asc', label: 'Title A–Z' },
  ],
  tv: [
    { value: 'popularity.desc', label: 'Most popular' },
    { value: 'vote_average.desc', label: 'Highest rated' },
    { value: 'first_air_date.desc', label: 'Newest' },
    { value: 'first_air_date.asc', label: 'Oldest' },
  ],
};

function readFilters(query: Record<string, string>): DiscoverFilters & { genreName?: string } {
  const type = query.type === 'tv' ? 'tv' : 'movie';
  const f: DiscoverFilters = { type };
  if (query.genre) f.genreId = Number(query.genre) || undefined;
  if (query.rating) f.minRating = Number(query.rating) || undefined;
  if (query.year) f.year = Number(query.year) || undefined;
  if (query.sort) f.sortBy = query.sort;
  if (query.lang) f.language = query.lang;
  return f;
}

export function BrowsePage({ inWatchlist, onToggleWatchlist }: BrowsePageProps) {
  const route = useHashRoute();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const filters = useMemo(() => readFilters(route.query), [route.query]);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const genreList = genres;

  useEffect(() => {
    getGenres()
      .then((g) => setGenres(filters.type === 'tv' ? g.tv : g.movie))
      .catch(() => {});
  }, [filters.type]);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) {
        setLoading(true);
        setError(false);
      } else {
        setLoadingMore(true);
      }
      try {
        const data = await discoverMedia(filters, pageNum);
        setResults((prev) => (append ? [...prev, ...(data.results || [])] : data.results || []));
        setTotalPages(data.total_pages || 1);
        setPage(pageNum);
      } catch (err) {
        console.error(err);
        if (!append) setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filterKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const updateQuery = (patch: Record<string, string>) => {
    const q = new URLSearchParams(route.query);
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    navigate(`/browse?${q.toString()}`);
  };

  const handleToggle = (movie: Movie) => {
    onToggleWatchlist(
      {
        id: movie.id,
        media_type: getMediaType(movie),
        title: getTitle(movie),
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        vote_average: movie.vote_average,
        release_date: getReleaseDate(movie),
        overview: movie.overview,
      },
      movie
    );
  };

  const activeGenre = genres.find((g) => g.id === filters.genreId);

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <SlidersHorizontal className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Browse</h1>
          {activeGenre && (
            <span className="text-sm text-zinc-400">
              {activeGenre.name} {filters.type === 'tv' ? 'TV shows' : 'movies'}
            </span>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-5">
          {(['movie', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateQuery({ type: t })}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.type === t
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {t === 'movie' ? 'Movies' : 'TV Shows'}
            </button>
          ))}
        </div>

        {/* Genre chips */}
        {genreList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
            <button
              onClick={() => updateQuery({ genre: '' })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !filters.genreId
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              All genres
            </button>
            {genreList.map((g) => (
              <button
                key={g.id}
                onClick={() => updateQuery({ genre: String(g.id) })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filters.genreId === g.id
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Structured filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <select
            value={filters.minRating ? String(filters.minRating) : ''}
            onChange={(e) => updateQuery({ rating: e.target.value })}
            className="bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 outline-none focus:border-red-500"
            aria-label="Minimum rating"
          >
            <option value="">Any rating</option>
            <option value="7">7+ rated</option>
            <option value="8">8+ rated</option>
            <option value="8.5">8.5+ rated</option>
          </select>

          <select
            value={filters.year ? String(filters.year) : ''}
            onChange={(e) => updateQuery({ year: e.target.value })}
            className="bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 outline-none focus:border-red-500"
            aria-label="Release year"
          >
            <option value="">Any year</option>
            {Array.from({ length: 26 }, (_, i) => 2026 - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={filters.language || ''}
            onChange={(e) => updateQuery({ lang: e.target.value })}
            className="bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 outline-none focus:border-red-500"
            aria-label="Language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code || 'any'} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <select
            value={filters.sortBy || 'popularity.desc'}
            onChange={(e) => updateQuery({ sort: e.target.value })}
            className="bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 outline-none focus:border-red-500"
            aria-label="Sort by"
          >
            {SORTS[filters.type].map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {loading && <Spinner message="Finding titles..." />}
        {error && !loading && (
          <ErrorState message="Couldn't load titles. Please try again." onRetry={() => loadPage(1, false)} />
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
            <p className="text-lg text-zinc-300">No titles match these filters</p>
            <p className="text-sm text-zinc-500">Try widening the rating, year, or genre.</p>
            <button
              onClick={() => navigate('/browse')}
              className="mt-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {results.map((movie) => (
                <MovieCard
                  key={`${movie.id}-${movie.media_type}`}
                  movie={movie}
                  inWatchlist={inWatchlist(movie.id)}
                  onToggleWatchlist={handleToggle}
                />
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => loadPage(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Loading...' : `Load more (page ${page + 1} of ${totalPages})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
