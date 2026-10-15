import { useCallback } from 'react';
import type { WatchlistItem } from '@/types';
import { useHashRoute, matchRoute, navigate } from '@/lib/router';
import { useWatchlist } from '@/lib/useWatchlist';
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
  const { watchlist, isInWatchlist, toggleWatchlist, removeFromWatchlist } = useWatchlist();

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
          />
        )}

        {matched.page === 'movie' && matched.id && (
          <DetailPage
            mediaType="movie"
            id={matched.id}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {matched.page === 'tv' && matched.id && (
          <DetailPage
            mediaType="tv"
            id={matched.id}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
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
            onToggleWatchlist={handleToggleWatchlist}
            onRemove={removeFromWatchlist}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
