import { useCallback } from 'react';
import type { WatchlistItem } from '@/types';
import { useHashRoute, matchRoute, navigate } from '@/lib/router';
import { useWatchlist } from '@/lib/useWatchlist';
import { useWatchHistory } from '@/lib/useHistory';
import { isConfigured } from '@/lib/tmdb';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConfigWarning } from '@/components/ConfigWarning';
import { HomePage } from '@/pages/HomePage';
import { DetailPage } from '@/pages/DetailPage';
import { SearchPage } from '@/pages/SearchPage';
import { BrowsePage } from '@/pages/BrowsePage';
import { WatchlistPage } from '@/pages/WatchlistPage';

function App() {
  const route = useHashRoute();
  const matched = matchRoute(route);
  const { watchlist, isInWatchlist, toggleWatchlist, removeFromWatchlist, clearWatchlist } =
    useWatchlist();
  const {
    history: watchHistory,
    recordWatch,
    removeFromHistory,
    clearHistory,
  } = useWatchHistory();

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleToggleWatchlist = useCallback(
    (item: Omit<WatchlistItem, 'added_at'>) => {
      toggleWatchlist(item);
    },
    [toggleWatchlist]
  );

  if (!isConfigured()) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <ConfigWarning />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar onSearch={handleSearch} initialQuery={matched.query || ''} />

      <main>
        {matched.page === 'home' && (
          <HomePage
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            watchHistory={watchHistory}
            onRemoveFromHistory={removeFromHistory}
          />
        )}

        {matched.page === 'movie' && matched.id && (
          <DetailPage
            mediaType="movie"
            id={matched.id}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onRecordWatch={recordWatch}
          />
        )}

        {matched.page === 'tv' && matched.id && (
          <DetailPage
            mediaType="tv"
            id={matched.id}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onRecordWatch={recordWatch}
          />
        )}

        {matched.page === 'search' && (
          <SearchPage
            query={matched.query || ''}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {matched.page === 'browse' && (
          <BrowsePage
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {matched.page === 'watchlist' && (
          <WatchlistPage
            watchlist={watchlist}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onRemove={removeFromWatchlist}
            onClearAll={clearWatchlist}
            watchHistory={watchHistory}
            onRemoveFromHistory={removeFromHistory}
            onClearHistory={clearHistory}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
