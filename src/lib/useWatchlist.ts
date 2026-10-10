import { useEffect, useState, useCallback } from 'react';
import type { WatchlistItem } from '@/types';

const STORAGE_KEY = 'cineverse_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWatchlist(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (items: WatchlistItem[]) => {
    setWatchlist(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const isInWatchlist = useCallback(
    (id: number) => watchlist.some((item) => item.id === id),
    [watchlist]
  );

  const addToWatchlist = useCallback(
    (item: Omit<WatchlistItem, 'added_at'>) => {
      setWatchlist((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        const next = [...prev, { ...item, added_at: Date.now() }];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
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

  return { watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist, toggleWatchlist };
}
