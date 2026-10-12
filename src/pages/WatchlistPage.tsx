import { Bookmark, Trash2 } from 'lucide-react';
import type { Movie, WatchlistItem } from '@/types';
import { MovieCard } from '@/components/MovieCard';
import { navigate } from '@/lib/router';

interface WatchlistPageProps {
  watchlist: WatchlistItem[];
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
  onRemove: (id: number) => void;
}

export function WatchlistPage({
  watchlist,
  onToggleWatchlist,
  onRemove,
}: WatchlistPageProps) {
  const handleToggle = (movie: Movie) => {
    onToggleWatchlist(
      {
        id: movie.id,
        media_type: movie.media_type === 'tv' ? 'tv' : 'movie',
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
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Watchlist</h1>
          {watchlist.length > 0 && (
            <span className="text-sm text-zinc-500">({watchlist.length})</span>
          )}
        </div>

        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
              <Bookmark className="w-10 h-10 text-zinc-600" />
            </div>
            <div>
              <p className="text-lg text-zinc-300 font-medium mb-1">Your watchlist is empty</p>
              <p className="text-sm text-zinc-500 max-w-sm">
                Browse movies and TV shows, then tap the + button to save them here for later.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors mt-2"
            >
              Browse Content
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {watchlist.map((item) => (
              <div key={`${item.id}-${item.media_type}`} className="relative">
                <MovieCard
                  movie={{
                    id: item.id,
                    title: item.title,
                    poster_path: item.poster_path,
                    backdrop_path: item.backdrop_path,
                    vote_average: item.vote_average,
                    release_date: item.release_date || undefined,
                    overview: item.overview,
                    media_type: item.media_type,
                    popularity: 0,
                  }}
                  inWatchlist={true}
                  onToggleWatchlist={handleToggle}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-colors"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
