import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [failedIds, setFailedIds] = useState<ReadonlySet<number>>(new Set());
  const pickedRef = useRef(false);

  // Only titles with a working backdrop can be featured; ones whose image
  // fails to load are dropped so the hero never shows a black hole.
  const items = useMemo(
    () => movies.filter((m) => m.backdrop_path && !failedIds.has(m.id)).slice(0, 5),
    [movies, failedIds]
  );
  const count = items.length;
  const safeIndex = count > 0 ? index % count : 0;
  const movie = items[safeIndex] ?? movies[0];

  // Feature a different title on each visit instead of always opening on #1.
  useEffect(() => {
    if (count > 0 && !pickedRef.current) {
      pickedRef.current = true;
      setIndex(Math.floor(Math.random() * count));
    }
    if (count === 0) {
      pickedRef.current = false;
    }
  }, [count]);

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
      className="relative h-[62vh] min-h-[440px] md:h-[70vh] md:min-h-[500px] w-full"
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
          onError={() =>
            setFailedIds((prev) => new Set(prev).add(movie.id))
          }
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-10 pb-8 md:pb-16">
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
                {safeIndex + 1} / {count}
              </span>
            )}
          </div>

          <h1 className="text-[1.7rem] leading-tight sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 line-clamp-2 md:line-clamp-none">
            {title}
          </h1>

          <p className="text-sm md:text-base text-zinc-300 mb-5 md:mb-6 max-w-xl leading-relaxed line-clamp-2 md:line-clamp-3">
            {truncate(movie.overview || 'No description available.', 250)}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
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
            <div className="flex items-center gap-2 mt-4 md:mt-6">
              {items.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === safeIndex ? 'w-8 bg-white' : 'w-4 bg-zinc-600 hover:bg-zinc-400'
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
