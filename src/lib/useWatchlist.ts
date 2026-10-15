import { useEffect, useState, useCallback } from 'react';
import type { WatchlistItem } from '@/types';
import { safeGet, safeSet, safeRemove, isRecord } from '@/lib/storage';

const STORAGE_KEY = 'muteeb_movie_watchlist_v1';

function isWatchlistItem(v: unknown): v is WatchlistItem {
  return (
    isRecord(v) &&
    typeof v.id === 'number' &&
    (v.media_type === 'movie' || v.media_type === 'tv') &&
    typeof v.title === 'string'
  );
}

function isWatchlist(v: unknown): v is WatchlistItem[] {
  return Array.isArray(v) && v.every(isWatchlistItem);
}

export function useWatchlist() {
  // Lazily read from storage so a corrupt value can never break first render.
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() =>
    safeGet(STORAGE_KEY, [], isWatchlist)
  );

  // Migrate the legacy key from the original build once.
  useEffect(() => {
    try {
      const legacy = localStorage.getItem('cineverse_watchlist');
      if (legacy && watchlist.length === 0) {
        const parsed: unknown = JSON.parse(legacy);
        if (isWatchlist(parsed) && parsed.length > 0) {
          setWatchlist(parsed);
          safeSet(STORAGE_KEY, parsed);
        }
        localStorage.removeItem('cineverse_watchlist');
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInWatchlist = useCallback(
    (id: number) => watchlist.some((item) => item.id === id),
    [watchlist]
  );

  const addToWatchlist = useCallback(
    (item: Omit<WatchlistItem, 'added_at'>) => {
      setWatchlist((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        const next = [...prev, { ...item, added_at: Date.now() }];
        safeSet(STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => {
      const next = prev.filter((item) => item.id !== id);
      safeSet(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
    safeRemove(STORAGE_KEY);
  }, []);

  const toggleWatchlist = useCallback(
    (item: Omit<WatchlistItem, 'added_at'>) => {
      if (isInWatchlist(item.id)) {
        removeFromWatchlist(item.id);
      } else {
        addToWatchlist(item);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  return { watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist, toggleWatchlist, clearWatchlist };
}
