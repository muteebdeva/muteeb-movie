import { useEffect, useState } from 'react';
import { Play, Info, Star, Plus, Check } from 'lucide-react';
import type { Movie } from '@/types';
import { backdropUrl } from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { getTitle, getMediaType, getReleaseDate, formatYear, truncate } from '@/lib/utils';

interface HeroProps {
  movies: Movie[];
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

const ROTATE_MS = 8000;

export function Hero({ movies, inWatchlist, onToggleWatchlist }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);

  const items = movies.filter((m) => m.backdrop_path).slice(0, 5);
  const movie = items[index] ?? movies[0];
  const count = items.length;

  useEffect(() => {
    setIndex(0);
  }, [movies.length]);

  useEffect(() => {
    setLoaded(false);
  }, [movie?.id]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  if (!movie) return null;

  const mediaType = getMediaType(movie);
  const title = getTitle(movie);
  const year = formatYear(getReleaseDate(movie));
  const backdrop = backdropUrl(movie.backdrop_path, 'w1280');

  return (
    <div
      className="relative h-[70vh] min-h-[500px] w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {!loaded && <div className="absolute inset-0 bg-zinc-900 animate-pulse" />}

      {backdrop && (
        <img
          key={movie.id}
          src={backdrop}
          alt={title}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-10 pb-12 md:pb-16">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-red-600 text-white">
              {mediaType === 'tv' ? 'TV Series' : 'Movie'}
            </span>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">
                {movie.vote_average?.toFixed(1)}
              </span>
            </div>
            {year && <span className="text-sm text-zinc-300">{year}</span>}
            {count > 1 && (
              <span className="text-xs text-zinc-500">
                {index + 1} / {count}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {title}
          </h1>

          <p className="text-sm md:text-base text-zinc-300 mb-6 max-w-xl leading-relaxed line-clamp-3">
            {truncate(movie.overview || 'No description available.', 250)}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/${mediaType}/${movie.id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              Play
            </button>
            <button
              onClick={() => navigate(`/${mediaType}/${movie.id}`)}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800/80 backdrop-blur text-white rounded-lg font-semibold hover:bg-zinc-700/80 transition-colors"
            >
              <Info className="w-5 h-5" />
              More Info
            </button>
            <button
              onClick={() => onToggleWatchlist(movie)}
              className="w-11 h-11 flex items-center justify-center bg-zinc-800/80 backdrop-blur text-white rounded-full hover:bg-zinc-700/80 transition-colors border border-zinc-600"
              title={inWatchlist(movie.id) ? 'Remove from watchlist' : 'Add to watchlist'}
              aria-label={inWatchlist(movie.id) ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {inWatchlist(movie.id) ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>

          {count > 1 && (
            <div className="flex items-center gap-2 mt-6">
              {items.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-8 bg-white' : 'w-4 bg-zinc-600 hover:bg-zinc-400'
                  }`}
                  aria-label={`Show ${getTitle(m)}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
