import { useEffect, useState } from 'react';
import {
  Play,
  Star,
  Plus,
  Check,
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import type { MediaDetails, MediaType, Movie, Episode, WatchlistItem } from '@/types';
import { getDetails, getSeason, imgUrl, backdropUrl } from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { VideoPlayer } from '@/components/VideoPlayer';
import { MovieRow } from '@/components/MovieRow';
import { Spinner, ErrorState } from '@/components/Spinner';
import { embedUrl } from '@/lib/vidapi';
import {
  getTitle,
  formatDate,
  formatRuntime,
  formatYear,
  truncate,
  ratingColor,
} from '@/lib/utils';

interface DetailPageProps {
  mediaType: MediaType;
  id: number;
  inWatchlist: (id: number) => boolean;
  onToggleWatchlist: (item: Omit<WatchlistItem, 'added_at'>, movie: Movie) => void;
}

export function DetailPage({
  mediaType,
  id,
  inWatchlist,
  onToggleWatchlist,
}: DetailPageProps) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [currentPlayerSrc, setCurrentPlayerSrc] = useState<string>('');

  const loadDetails = async () => {
    setLoading(true);
    setError(false);
    setShowPlayer(false);
    try {
      const data = await getDetails(mediaType, id);
      setDetails(data);
      if (mediaType === 'tv' && data.seasons && data.seasons.length > 0) {
        const firstSeason = data.seasons.find((s) => s.season_number > 0) || data.seasons[0];
        setSelectedSeason(firstSeason.season_number);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [mediaType, id]);

  useEffect(() => {
    if (mediaType !== 'tv' || !details) return;
    let cancelled = false;
    setEpisodesLoading(true);
    getSeason(details.id, selectedSeason)
      .then((data) => {
        if (!cancelled) {
          setEpisodes(data.episodes || []);
          setSelectedEpisode(1);
        }
      })
      .catch(() => {
        if (!cancelled) setEpisodes([]);
      })
      .finally(() => {
        if (!cancelled) setEpisodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, details, selectedSeason]);

  if (loading) return <Spinner message="Loading details..." />;
  if (error)
    return (
      <ErrorState
        message="Failed to load details. Please try again."
        onRetry={loadDetails}
      />
    );
  if (!details) return <ErrorState message="No data found." />;

  const title = getTitle(details);
  const year = formatYear(details.release_date || details.first_air_date);
  const backdrop = backdropUrl(details.backdrop_path, 'original');
  const inList = inWatchlist(details.id);

  const imdbId = details.imdb_id || details.external_ids?.imdb_id;

  const handlePlay = () => {
    const src = embedUrl(
      mediaType,
      details.id,
      imdbId,
      mediaType === 'tv' ? selectedSeason : undefined,
      mediaType === 'tv' ? selectedEpisode : undefined
    );
    setCurrentPlayerSrc(src);
    setShowPlayer(true);
    setTimeout(() => {
      document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleToggleList = () => {
    onToggleWatchlist(
      {
        id: details.id,
        media_type: mediaType,
        title,
        poster_path: details.poster_path,
        backdrop_path: details.backdrop_path,
        vote_average: details.vote_average,
        release_date: details.release_date || details.first_air_date || null,
        overview: details.overview,
      },
      details
    );
  };

  const director =
    details.credits?.crew.find((c) => c.job === 'Director')?.name ||
    details.created_by?.map((c) => c.name).join(', ');
  const cast = details.credits?.cast.slice(0, 6) || [];
  const similar = details.similar?.results.slice(0, 20) || details.recommendations?.results.slice(0, 20) || [];
  const recommendations = details.recommendations?.results.slice(0, 20) || [];

  const validSeasons = (details.seasons || []).filter((s) => s.season_number > 0);

  const handleSimilarToggle = (movie: Movie) => {
    onToggleWatchlist(
      {
        id: movie.id,
        media_type: mediaType,
        title: getTitle(movie),
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
    <div className="min-h-screen">
      {/* Backdrop hero */}
      <div className="relative h-[50vh] min-h-[350px] w-full">
        {backdrop && (
          <img
            src={backdrop}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 to-transparent" />

        <button
          onClick={() => window.history.back()}
          className="absolute top-20 left-4 sm:left-6 lg:left-10 flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Content */}
      <div className="relative -mt-40 px-4 sm:px-6 lg:px-10 pb-12">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-[1600px] mx-auto">
          {/* Poster */}
          <div className="hidden md:block w-[260px] shrink-0">
            {details.poster_path && (
              <img
                src={imgUrl(details.poster_path, 'w500')}
                alt={title}
                className="w-full rounded-xl shadow-2xl shadow-black/60"
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              {title}
              {year && <span className="text-xl md:text-2xl text-zinc-400 font-normal ml-3">({year})</span>}
            </h1>

            {details.tagline && (
              <p className="text-sm md:text-base text-zinc-400 italic mb-4">"{details.tagline}"</p>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className={`font-bold ${ratingColor(details.vote_average)}`}>
                  {details.vote_average?.toFixed(1)}
                </span>
                <span className="text-zinc-500">({details.vote_count?.toLocaleString()})</span>
              </div>
              {details.runtime && (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock className="w-4 h-4" />
                  {formatRuntime(details.runtime)}
                </div>
              )}
              {details.number_of_seasons && (
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Calendar className="w-4 h-4" />
                  {details.number_of_seasons} Seasons · {details.number_of_episodes} Episodes
                </div>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${details.status === 'Released' || details.status === 'Ended' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'}`}>
                {details.status}
              </span>
            </div>

            {/* Genres */}
            {details.genres && details.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {details.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            <p className="text-sm md:text-base text-zinc-300 leading-relaxed mb-6">
              {details.overview || 'No description available.'}
            </p>

            {/* Play & Watchlist */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={handlePlay}
                className="flex items-center gap-2 px-7 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </button>
              <button
                onClick={handleToggleList}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  inList
                    ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                {inList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {inList ? 'In My List' : 'Add to List'}
              </button>
            </div>

            {/* Cast & crew */}
            {(director || cast.length > 0) && (
              <div className="mb-6 space-y-3">
                {director && (
                  <div className="flex items-start gap-2 text-sm">
                    <User className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-zinc-500">{mediaType === 'tv' ? 'Created by' : 'Director'}: </span>
                      <span className="text-zinc-200">{director}</span>
                    </div>
                  </div>
                )}
                {cast.length > 0 && (
                  <div className="text-sm">
                    <span className="text-zinc-500">Cast: </span>
                    <span className="text-zinc-200">
                      {cast.map((c) => c.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Release date */}
            {(details.release_date || details.first_air_date) && (
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Calendar className="w-4 h-4" />
                Released: {formatDate(details.release_date || details.first_air_date)}
              </div>
            )}
          </div>
        </div>

        {/* Player Section */}
        {showPlayer && currentPlayerSrc && (
          <div id="player-section" className="max-w-[1600px] mx-auto mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Now Playing: {title}</h2>
              {mediaType === 'tv' && (
                <span className="text-sm text-zinc-400">
                  S{selectedSeason} · E{selectedEpisode}
                </span>
              )}
            </div>
            <VideoPlayer src={currentPlayerSrc} title={title} />
          </div>
        )}

        {/* TV Seasons & Episodes */}
        {mediaType === 'tv' && validSeasons.length > 0 && (
          <div className="max-w-[1600px] mx-auto mt-10">
            <h2 className="text-xl font-bold text-white mb-4">Episodes</h2>
            <div className="flex flex-wrap gap-2 mb-5">
              {validSeasons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeason(s.season_number)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSeason === s.season_number
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Season {s.season_number}
                </button>
              ))}
            </div>

            {episodesLoading ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading episodes...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                {episodes.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setSelectedEpisode(ep.episode_number);
                      const src = embedUrl(
                        mediaType,
                        details.id,
                        imdbId,
                        selectedSeason,
                        ep.episode_number
                      );
                      setCurrentPlayerSrc(src);
                      setShowPlayer(true);
                      setTimeout(() => {
                        document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className={`flex items-center gap-4 w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEpisode === ep.episode_number
                        ? 'bg-zinc-800 border border-zinc-600'
                        : 'bg-zinc-900/50 hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    <div className="w-24 h-14 shrink-0 rounded overflow-hidden bg-zinc-800">
                      {ep.still_path && (
                        <img
                          src={imgUrl(ep.still_path, 'w300')}
                          alt={ep.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        E{ep.episode_number}. {ep.name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {truncate(ep.overview || 'No description', 100)}
                      </p>
                    </div>
                    {ep.vote_average > 0 && (
                      <div className="flex items-center gap-1 text-xs shrink-0">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-zinc-300">{ep.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                  </button>
                ))}
                {episodes.length === 0 && (
                  <p className="text-sm text-zinc-500 py-4">No episodes found for this season.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Similar & Recommendations */}
        {similar.length > 0 && (
          <div className="mt-10">
            <MovieRow
              title="More Like This"
              movies={similar.map((m) => ({ ...m, media_type: mediaType }))}
              inWatchlist={inWatchlist}
              onToggleWatchlist={handleSimilarToggle}
            />
          </div>
        )}
        {recommendations.length > 0 && (
          <div className="mt-2">
            <MovieRow
              title="Recommended for You"
              movies={recommendations.map((m) => ({ ...m, media_type: mediaType }))}
              inWatchlist={inWatchlist}
              onToggleWatchlist={handleSimilarToggle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
