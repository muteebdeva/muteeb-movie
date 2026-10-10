import { useEffect, useState } from 'react';
import type { Movie } from '@/types';
import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getPopularTV,
  getTopRatedTV,
} from '@/lib/tmdb';
import { isConfigured } from '@/lib/tmdb';
import { Hero } from '@/components/Hero';
import { MovieRow } from '@/components/MovieRow';
import { Spinner, ErrorState } from '@/components/Spinner';
import type { WatchlistItem } from '@/types';

interface HomePageProps {
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
}

export function HomePage({ inWatchlist, onToggleWatchlist }: HomePageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<Movie[]>([]);

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
    try {
      const [trend, popM, topM, upM, popTV, topTV] = await Promise.all([
        getTrending('all', 'week'),
        getPopularMovies(),
        getTopRatedMovies(),
        getUpcomingMovies(),
        getPopularTV(),
        getTopRatedTV(),
      ]);
      setTrending(trend);
      setPopularMovies(popM.results);
      setTopRated(topM.results);
      setUpcoming(upM.results);
      setPopularTV(popTV.results);
      setTopRatedTV(topTV.results);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Spinner message="Loading movies & TV shows..." />;
  if (error)
    return (
      <ErrorState
        message="Failed to load content. Please check your TMDB API key."
        onRetry={loadData}
      />
    );

  const heroMovie = trending[0] || popularMovies[0];

  return (
    <div>
      {heroMovie && (
        <Hero
          movie={heroMovie}
          inWatchlist={inWatchlist(heroMovie.id)}
          onToggleWatchlist={handleToggle}
        />
      )}

      <div className="relative z-10 -mt-16 md:-mt-24 space-y-1 pb-12">
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
          title="Popular TV Shows"
          movies={popularTV}
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
