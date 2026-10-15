import { useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Movie } from '@/types';
import { MovieCard } from '@/components/MovieCard';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
  /** Optional per-item remove action (e.g. for history rows). */
  onRemove?: (movie: Movie) => void;
  removeLabel?: string;
  /** Optional genuine playback progress 0..1 per item (e.g. Continue Watching). */
  progressFor?: (movie: Movie) => number | undefined;
}

export function MovieRow({ title, movies, inWatchlist, onToggleWatchlist, onRemove, removeLabel = 'Remove', progressFor }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative group/row mb-8 md:mb-10">
      <h2 className="text-lg md:text-xl font-bold text-white px-4 sm:px-6 lg:px-10 mb-4">
        {title}
      </h2>

      <div className="relative">
        <button
          onClick={() => scroll('left')}
          aria-label={`Scroll ${title} left`}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-10 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            <div key={`${movie.id}-${movie.media_type ?? ''}`} className="relative shrink-0">
              <MovieCard
                movie={movie}
                inWatchlist={inWatchlist(movie.id)}
                onToggleWatchlist={onToggleWatchlist}
                progress={progressFor?.(movie)}
              />
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(movie);
                  }}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-black/90 transition-colors"
                  aria-label={`${removeLabel}: ${movie.title || movie.name}`}
                  title={removeLabel}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          aria-label={`Scroll ${title} right`}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
    </section>
  );
}
