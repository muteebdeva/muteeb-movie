import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie } from '@/types';
import { MovieCard } from '@/components/MovieCard';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export function MovieRow({ title, movies, inWatchlist, onToggleWatchlist }: MovieRowProps) {
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
            <MovieCard
              key={`${movie.id}-${movie.media_type ?? ''}`}
              movie={movie}
              inWatchlist={inWatchlist(movie.id)}
              onToggleWatchlist={onToggleWatchlist}
            />
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
