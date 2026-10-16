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
  getDetails,
  discoverMedia,
} from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { Hero } from '@/components/Hero';
import { MovieRow } from '@/components/MovieRow';
import { SkeletonRow, SkeletonHero } from '@/components/Skeleton';
import { ErrorState } from '@/components/Spinner';
import { getSiteConfig, type SiteConfig } from '@/lib/siteConfig';
import { trackEvent } from '@/lib/tracking';
import type { WatchlistItem } from '@/types';
import type { WatchHistoryItem } from '@/lib/useHistory';

interface HomePageProps {
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
  watchHistory: WatchHistoryItem[];
  onRemoveFromHistory: (id: number) => void;
}

/** Fallback shelf order — identical to the previous hardcoded homepage. */
const DEFAULT_SECTIONS: { section_key: string; title: string; source: string }[] = [
  { section_key: 'continue_watching', title: 'Continue Watching', source: 'internal:history' },
  { section_key: 'trending', title: 'Trending This Week', source: 'tmdb:trending' },
  { section_key: 'popular_movies', title: 'Popular Movies', source: 'tmdb:popular_movies' },
  { section_key: 'hidden_gems', title: 'Hidden Gems', source: 'tmdb:hidden_gems' },
  { section_key: 'popular_tv', title: 'Popular TV Shows', source: 'tmdb:popular_tv' },
  { section_key: 'indian_cinema', title: 'Indian Cinema', source: 'tmdb:indian_cinema' },
  { section_key: 'anime', title: 'Anime', source: 'tmdb:anime' },
  { section_key: 'top_rated_movies', title: 'Top Rated Movies', source: 'tmdb:top_rated_movies' },
  { section_key: 'top_rated_tv', title: 'Top Rated TV Shows', source: 'tmdb:top_rated_tv' },
  { section_key: 'upcoming', title: 'Upcoming Movies', source: 'tmdb:upcoming' },
];

interface CuratedRow {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  custom_title: string | null;
  custom_overview: string | null;
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
  is_featured: boolean;
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
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [curatedRows, setCuratedRows] = useState<Record<string, Movie[]>>({});
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
    trackEvent('page_view');
    getSiteConfig().then((cfg) => {
      if (cfg) setSiteConfig(cfg);
    });
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve curated collections (e.g. Staff Picks) into full TMDB titles.
  useEffect(() => {
    const sections = siteConfig?.sections ?? DEFAULT_SECTIONS;
    const keys = sections
      .filter((s) => s.source.startsWith('collection:'))
      .map((s) => s.source.slice('collection:'.length));
    if (keys.length === 0) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, Movie[]> = {};
      for (const key of keys) {
        try {
          const res = await fetch(`/api/curated?collection=${encodeURIComponent(key)}`);
          const data = res.ok ? await res.json() : null;
          const rows: CuratedRow[] = data && data.ok ? data.data : [];
          const movies: Movie[] = [];
          for (const row of rows.slice(0, 20)) {
            try {
              const d = await getDetails(row.media_type, row.tmdb_id);
              movies.push({
                ...(d as unknown as Movie),
                title: row.custom_title || (d as unknown as Movie).title,
                overview: row.custom_overview || (d as unknown as Movie).overview,
                poster_path: row.custom_poster_path || (d as unknown as Movie).poster_path,
                backdrop_path: row.custom_backdrop_path || (d as unknown as Movie).backdrop_path,
                media_type: row.media_type,
              });
            } catch {
              /* skip titles TMDB can't resolve */
            }
          }
          out[`collection:${key}`] = movies;
        } catch {
          out[`collection:${key}`] = [];
        }
      }
      if (!cancelled) setCuratedRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [siteConfig]);

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

      {/* Genre quick-browse + Surprise Me — its own row in normal flow below
          the hero, so it can never overlap the hero's action buttons. The
          chips live on a w-max track inside an overflow-x-auto scroller:
          one swipeable line, vertically centered with the button, and the
          scroller clips internally so the page itself never scrolls sideways. */}
      <div className="px-4 sm:px-6 lg:px-10 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={surpriseMe}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-semibold transition-colors shrink-0"
            title="Pick a random title for me"
          >
            <Dices className="w-4 h-4" />
            Surprise Me
          </button>
          {genres.length > 0 && (
            <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex w-max items-center gap-2 py-1">
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
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 space-y-1 pb-12">
        {(siteConfig?.sections ?? DEFAULT_SECTIONS).map((section) => {
          // Continue Watching keeps its special history props.
          if (section.source === 'internal:history') {
            return historyMovies.length > 0 ? (
              <MovieRow
                key={section.section_key}
                title={section.title}
                movies={historyMovies}
                inWatchlist={inWatchlist}
                onToggleWatchlist={handleToggle}
                onRemove={(m) => onRemoveFromHistory(m.id)}
                removeLabel="Remove from history"
                progressFor={(m) => historyProgress.get(m.id)}
              />
            ) : null;
          }
          // Curated collections resolved from the admin panel.
          if (section.source.startsWith('collection:')) {
            const movies = curatedRows[section.source] ?? [];
            return movies.length > 0 ? (
              <MovieRow
                key={section.section_key}
                title={section.title}
                movies={movies}
                inWatchlist={inWatchlist}
                onToggleWatchlist={handleToggle}
              />
            ) : null;
          }
          // TMDB-driven feeds (the site's long-standing behaviour).
          const tmdbSources: Record<string, Movie[]> = {
            'tmdb:trending': trending,
            'tmdb:popular_movies': popularMovies,
            'tmdb:hidden_gems': hiddenGems,
            'tmdb:popular_tv': popularTV,
            'tmdb:indian_cinema': indianCinema,
            'tmdb:anime': anime,
            'tmdb:top_rated_movies': topRated,
            'tmdb:top_rated_tv': topRatedTV,
            'tmdb:upcoming': upcoming,
          };
          const movies = tmdbSources[section.source];
          if (!movies) return null;
          return (
            <MovieRow
              key={section.section_key}
              title={section.title}
              movies={movies}
              inWatchlist={inWatchlist}
              onToggleWatchlist={handleToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
