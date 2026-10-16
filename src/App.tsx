import { useCallback, useEffect, useState } from 'react';
import type { WatchlistItem } from '@/types';
import { useHashRoute, matchRoute, navigate } from '@/lib/router';
import { useWatchlist } from '@/lib/useWatchlist';
import { useWatchHistory } from '@/lib/useHistory';
import { isConfigured } from '@/lib/tmdb';
import { getSiteConfig, type SiteConfig } from '@/lib/siteConfig';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ConfigWarning } from '@/components/ConfigWarning';
import { HomePage } from '@/pages/HomePage';
import { DetailPage } from '@/pages/DetailPage';
import { SearchPage } from '@/pages/SearchPage';
import { BrowsePage } from '@/pages/BrowsePage';
import { WatchlistPage } from '@/pages/WatchlistPage';
import { AdminApp } from '@/pages/admin/AdminApp';

function App() {
  const route = useHashRoute();
  const matched = matchRoute(route);
  const { watchlist, isInWatchlist, toggleWatchlist, removeFromWatchlist, clearWatchlist } =
    useWatchlist();
  const {
    history: watchHistory,
    recordWatch,
    updateProgress,
    clearResume,
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

  // Site-wide config (branding, announcement, maintenance). Fail-soft: null
  // means the admin backend isn't configured — the site runs as before.
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  useEffect(() => {
    getSiteConfig().then((cfg) => {
      if (cfg) setSiteConfig(cfg);
    });
    try {
      if (sessionStorage.getItem('mm_ann_dismissed') === '1') setAnnouncementDismissed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const dismissAnnouncement = () => {
    setAnnouncementDismissed(true);
    try {
      sessionStorage.setItem('mm_ann_dismissed', '1');
    } catch {
      /* ignore */
    }
  };

  // The admin panel is always reachable (even without a TMDB key or during
  // maintenance) — it has its own auth and layout.
  if (matched.page === 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <AdminApp />
      </div>
    );
  }

  if (!isConfigured()) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <ConfigWarning />
      </div>
    );
  }

  // Maintenance mode (set in the admin panel). Admin route above bypasses it.
  if (siteConfig?.maintenance?.enabled) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-2xl font-bold text-white mb-3">We'll be back soon</p>
          <p className="text-zinc-400">
            {siteConfig.maintenance.message || 'The site is undergoing scheduled maintenance.'}
          </p>
        </div>
      </div>
    );
  }

  const announcement = siteConfig?.announcement;
  const showAnnouncement = !!announcement?.enabled && !!announcement?.text && !announcementDismissed;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar onSearch={handleSearch} initialQuery={matched.query || ''} />

      {showAnnouncement && (
        <div className="mt-16 bg-red-600/15 border-b border-red-600/30 text-sm text-red-200">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex items-center gap-3">
            <p className="flex-1 truncate">{announcement.text}</p>
            <button
              onClick={dismissAnnouncement}
              className="shrink-0 text-red-300 hover:text-white text-lg leading-none px-1"
              aria-label="Dismiss announcement"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
            watchHistory={watchHistory}
            onUpdateProgress={updateProgress}
            onClearResume={clearResume}
          />
        )}

        {matched.page === 'tv' && matched.id && (
          <DetailPage
            mediaType="tv"
            id={matched.id}
            inWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onRecordWatch={recordWatch}
            watchHistory={watchHistory}
            onUpdateProgress={updateProgress}
            onClearResume={clearResume}
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
