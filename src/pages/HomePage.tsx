import { useEffect, useState, useRef } from 'react';
import { Shuffle, Dices } from 'lucide-react';
import type { Genre, Movie } from '@/types';
import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getPopularTV,
  getTopRatedTV,
  getGenres,
  discoverMedia,
} from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { Hero } from '@/components/Hero';
import { MovieRow } from '@/components/MovieRow';
import { SkeletonRow, SkeletonHero } from '@/components/Skeleton';
import { ErrorState } from '@/components/Spinner';
import type { WatchlistItem } from '@/types';
import type { WatchHistoryItem } from '@/lib/useHistory';

interface HomePageProps {
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
  watchHistory: WatchHistoryItem[];
  onRemoveFromHistory: (id: number) => void;
}

export function HomePage({
  inWatchlist,
  onToggleWatchlist,
  watchHistory,
  onRemoveFromHistory,
}: HomePageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<Movie[]>([]);
  const [indianCinema, setIndianCinema] = useState<Movie[]>([]);
  const [anime, setAnime] = useState<Movie[]>([]);
  const [hiddenGems, setHiddenGems] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const loadData = async () => {
    setLoading(true);
    setError(false);

    safetyTimerRef.current = setTimeout(() => {
      setLoading(false);
    }, 10000);

    let anySuccess = false;

    const safeSet = <T,>(setter: (v: T) => void, value: T) => {
      setter(value);
      anySuccess = true;
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      setLoading(false);
    };

    const tasks: Promise<void>[] = [
      getTrending('all', 'week')
        .then((v) => safeSet(setTrending, v))
        .catch(() => {}),
      getPopularMovies()
        .then((v) => safeSet(setPopularMovies, v.results))
        .catch(() => {}),
      getPopularTV()
        .then((v) => safeSet(setPopularTV, v.results))
        .catch(() => {}),
      getTopRatedMovies()
        .then((v) => safeSet(setTopRated, v.results))
        .catch(() => {}),
      getUpcomingMovies()
        .then((v) => safeSet(setUpcoming, v.results))
        .catch(() => {}),
      getTopRatedTV()
        .then((v) => safeSet(setTopRatedTV, v.results))
        .catch(() => {}),
      // Indian cinema — popular titles from India (any language)
      discoverMedia({ type: 'movie', originCountry: 'IN', sortBy: 'popularity.desc' })
        .then((v) => safeSet(setIndianCinema, v.results))
        .catch(() => {}),
      // Anime — Japanese animation TV series
      discoverMedia({ type: 'tv', genreId: 16, language: 'ja', sortBy: 'popularity.desc' })
        .then((v) => safeSet(setAnime, v.results))
        .catch(() => {}),
      // Hidden gems — well-rated but little-seen movies
      discoverMedia({
        type: 'movie',
        minRating: 7,
        voteCountGte: 100,
        voteCountLte: 3000,
        sortBy: 'vote_average.desc',
      })
        .then((v) => safeSet(setHiddenGems, v.results))
        .catch(() => {}),
      getGenres()
        .then((g) => safeSet(setGenres, g.movie))
        .catch(() => {}),
    ];

    await Promise.allSettled(tasks);

    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    if (!anySuccess) {
      setError(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  const surpriseMe = () => {
    const pool = [...trending, ...popularMovies, ...topRated].filter((m) => m.id);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const type = pick.media_type === 'tv' ? 'tv' : 'movie';
    navigate(`/${type}/${pick.id}`);
  };

  if (loading && trending.length === 0 && popularMovies.length === 0 && popularTV.length === 0) {
    return (
      <div>
        <SkeletonHero />
        <div className="relative z-10 -mt-16 md:-mt-24 pb-12">
          <SkeletonRow title="Trending" />
          <SkeletonRow title="Popular" />
        </div>
      </div>
    );
  }

  if (error && trending.length === 0 && popularMovies.length === 0 && popularTV.length === 0) {
    return (
      <div className="pt-24">
        <ErrorState
          message="Unable to load content right now. The movie database may be busy — please try again in a moment."
          onRetry={loadData}
        />
      </div>
    );
  }

  const historyMovies: Movie[] = watchHistory.map((h) => ({
    id: h.id,
    title: h.title,
    poster_path: h.poster_path,
    backdrop_path: h.backdrop_path,
    vote_average: 0,
    overview: '',
    popularity: 0,
    media_type: h.media_type,
  }));

  const historyProgress = new Map<number, number>();
  for (const h of watchHistory) {
    if (h.progress && h.duration && h.duration > 0) {
      historyProgress.set(h.id, h.progress / h.duration);
    }
  }

  return (
    <div>
      {(trending.length > 0 || popularMovies.length > 0) && (
        <Hero
          movies={trending.length > 0 ? trending : popularMovies}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
      )}

      <div className="relative z-10 -mt-16 md:-mt-24 space-y-1 pb-12">
        {/* Genre quick-browse + Surprise Me */}
        <div className="px-4 sm:px-6 lg:px-10 mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={surpriseMe}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-semibold transition-colors shrink-0"
            title="Pick a random title for me"
          >
            <Dices className="w-4 h-4" />
            Surprise Me
          </button>
          {genres.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 flex-1 min-w-0">
              {genres.slice(0, 12).map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/browse?genre=${g.id}&type=movie`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 rounded-full text-sm font-medium whitespace-nowrap transition-colors border border-zinc-700/60"
                >
                  <Shuffle className="w-3.5 h-3.5 text-zinc-500" />
                  {g.name}
                </button>
              ))}
              <button
                onClick={() => navigate('/browse')}
                className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium whitespace-nowrap transition-colors"
              >
                All genres →
              </button>
            </div>
          )}
        </div>

        {historyMovies.length > 0 && (
          <MovieRow
            title="Continue Watching"
            movies={historyMovies}
            inWatchlist={inWatchlist}
            onToggleWatchlist={handleToggle}
            onRemove={(m) => onRemoveFromHistory(m.id)}
            removeLabel="Remove from history"
            progressFor={(m) => historyProgress.get(m.id)}
          />
        )}

        <MovieRow
          title="Trending This Week"
          movies={trending}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Popular Movies"
          movies={popularMovies}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Hidden Gems"
          movies={hiddenGems}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Popular TV Shows"
          movies={popularTV}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Indian Cinema"
          movies={indianCinema}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Anime"
          movies={anime}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Top Rated Movies"
          movies={topRated}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Top Rated TV Shows"
          movies={topRatedTV}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
        <MovieRow
          title="Upcoming Movies"
          movies={upcoming}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggle}
        />
      </div>
    </div>
  );
}
