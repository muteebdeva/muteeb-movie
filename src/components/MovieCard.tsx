import { Star, Plus, Check, Play } from 'lucide-react';
import type { Movie } from '@/types';
import { imgUrl } from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { getTitle, getMediaType, getReleaseDate, formatYear } from '@/lib/utils';

interface MovieCardProps {
  movie: Movie;
  inWatchlist: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export function MovieCard({ movie, inWatchlist, onToggleWatchlist }: MovieCardProps) {
  const mediaType = getMediaType(movie);
  const title = getTitle(movie);
  const year = formatYear(getReleaseDate(movie));
  const poster = imgUrl(movie.poster_path, 'w342');

  return (
    <div className="group relative w-[160px] sm:w-[180px] md:w-[200px] shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105">
      <div
        className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900"
        onClick={() => navigate(`/${mediaType}/${movie.id}`)}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Play className="w-8 h-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-semibold">{movie.vote_average?.toFixed(1) || 'N/A'}</span>
            {year && <span className="text-zinc-400">· {year}</span>}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatchlist(movie);
        }}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-black/90 hover:scale-110"
        aria-label={inWatchlist ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
        title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {inWatchlist ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Plus className="w-4 h-4 text-white" />
        )}
      </button>

      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {mediaType === 'tv' ? 'TV Series' : 'Movie'}
          {year && ` · ${year}`}
        </p>
      </div>
    </div>
  );
}
