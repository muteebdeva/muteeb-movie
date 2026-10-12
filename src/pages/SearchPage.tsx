import { useEffect, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import type { Movie, WatchlistItem } from '@/types';
import { searchMulti } from '@/lib/tmdb';
import { MovieCard } from '@/components/MovieCard';
import { Spinner, ErrorState } from '@/components/Spinner';
import { getMediaType } from '@/lib/utils';

interface SearchPageProps {
  query: string;
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
}

export function SearchPage({
  query,
  inWatchlist,
  onToggleWatchlist,
}: SearchPageProps) {
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    searchMulti(query)
      .then((data) => {
        if (cancelled) return;
        const filtered = (data.results || []).filter(
          (r: Movie) => r.media_type === 'movie' || r.media_type === 'tv'
        );
        setResults(filtered);
        setTotalResults(data.total_results || 0);
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
  }, [query]);

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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SearchIcon className="w-6 h-6 text-red-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Search Results</h1>
          </div>
          {query && (
            <p className="text-zinc-400">
              {loading ? 'Searching...' : `Found ${totalResults} results for "${query}"`}
            </p>
          )}
        </div>

        {!query && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <SearchIcon className="w-12 h-12 text-zinc-600" />
            <p className="text-lg text-zinc-400">Search for your favorite movies and TV shows</p>
          </div>
        )}

        {loading && <Spinner message="Searching..." />}
        {error && (
          <ErrorState message="Search failed. Please try again." />
        )}

        {!loading && !error && results.length > 0 && (
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
        )}

        {!loading && !error && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <p className="text-lg text-zinc-400">No results found for "{query}"</p>
            <p className="text-sm text-zinc-500">Try searching with a different title or keyword.</p>
          </div>
        )}
      </div>
    </div>
  );
}
