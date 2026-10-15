import { useEffect, useState } from 'react';
import { Search as SearchIcon, Loader2, History, X, Compass } from 'lucide-react';
import type { Movie, WatchlistItem } from '@/types';
import { searchMulti } from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { MovieCard } from '@/components/MovieCard';
import { Spinner, ErrorState } from '@/components/Spinner';
import { useSearchHistory } from '@/lib/useHistory';
import { getMediaType } from '@/lib/utils';

interface SearchPageProps {
  query: string;
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
}

type TypeFilter = 'all' | 'movie' | 'tv';

export function SearchPage({
  query,
  inWatchlist,
  onToggleWatchlist,
}: SearchPageProps) {
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { searches, recordSearch, removeSearch, clearSearches } = useSearchHistory();

  const trimmed = query.trim();

  useEffect(() => {
    setTypeFilter('all');
    if (!trimmed) {
      setResults([]);
      setPage(1);
      setTotalPages(1);
      return;
    }
    recordSearch(trimmed);

    let cancelled = false;
    setLoading(true);
    setError(false);

    searchMulti(trimmed, 1)
      .then((data) => {
        if (cancelled) return;
        const filtered = (data.results || []).filter(
          (r: Movie) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        setResults(filtered);
        setPage(1);
        setTotalPages(data.total_pages || 1);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    searchMulti(trimmed, nextPage)
      .then((data) => {
        const filtered = (data.results || []).filter(
          (r: Movie) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        // De-duplicate against already loaded results.
        setResults((prev) => {
          const seen = new Set(prev.map((m) => `${m.id}-${m.media_type}`));
          return [...prev, ...filtered.filter((m) => !seen.has(`${m.id}-${m.media_type}`))];
        });
        setPage(nextPage);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingMore(false));
  };

  const visibleResults =
    typeFilter === 'all' ? results : results.filter((m) => getMediaType(m) === typeFilter);

  const handleToggle = (movie: Movie) => {
    onToggleWatchlist(
      {
        id: movie.id,
        media_type: getMediaType(movie),
        title: movie.title || movie.name || 'Untitled',
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        vote_average: movie.vote_average,
        release_date: movie.release_date || movie.first_air_date || null,
        overview: movie.overview,
      },
      movie
    );
  };

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-10 pb-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <SearchIcon className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Search Results</h1>
          </div>
          {trimmed && (
            <p className="text-zinc-400">
              {loading ? 'Searching...' : `${results.length} titles loaded for “${trimmed}”`}
            </p>
          )}
        </div>

        {!trimmed && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-semibold text-white">Recent searches</h2>
              </div>
              {searches.length > 0 && (
                <button
                  onClick={clearSearches}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            {searches.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
                <SearchIcon className="w-12 h-12 text-zinc-600" />
                <p className="text-lg text-zinc-400">Search for your favorite movies and TV shows</p>
                <p className="text-sm text-zinc-500">Your recent searches will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {searches.map((s) => (
                  <span
                    key={s}
                    className="group flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full pl-4 pr-2 py-2 text-sm text-zinc-200 transition-colors"
                  >
                    <button
                      onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                      className="hover:text-white"
                    >
                      {s}
                    </button>
                    <button
                      onClick={() => removeSearch(s)}
                      className="p-1 text-zinc-500 hover:text-white"
                      aria-label={`Remove search “${s}”`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {trimmed && (
          <div className="flex gap-2 mb-6">
            {(['all', 'movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV Shows'}
              </button>
            ))}
          </div>
        )}

        {loading && <Spinner message="Searching..." />}
        {error && !loading && (
          <ErrorState message="Search failed. Please try again." />
        )}

        {!loading && !error && trimmed && visibleResults.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {visibleResults.map((movie) => (
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
                  onClick={loadMore}
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

        {!loading && !error && trimmed && visibleResults.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
            <p className="text-lg text-zinc-300">No results found for “{trimmed}”</p>
            <p className="text-sm text-zinc-500 max-w-md">
              Check the spelling, try a different title, or browse by genre instead.
            </p>
            <button
              onClick={() => navigate('/browse')}
              className="flex items-center gap-2 mt-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors"
            >
              <Compass className="w-4 h-4" />
              Browse by genre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
