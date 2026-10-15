import { useCallback, useState } from 'react';
import type { MediaType } from '@/types';
import { safeGet, safeSet, safeRemove, isRecord } from '@/lib/storage';

export interface WatchHistoryItem {
  id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  watched_at: number;
}

const WATCH_HISTORY_KEY = 'muteeb_movie_watch_history';
const SEARCH_HISTORY_KEY = 'muteeb_movie_search_history';
const MAX_WATCH_HISTORY = 20;
const MAX_SEARCH_HISTORY = 10;

function isWatchHistoryItem(v: unknown): v is WatchHistoryItem {
  return (
    isRecord(v) &&
    typeof v.id === 'number' &&
    (v.media_type === 'movie' || v.media_type === 'tv') &&
    typeof v.title === 'string'
  );
}

function isWatchHistoryList(v: unknown): v is WatchHistoryItem[] {
  return Array.isArray(v) && v.every(isWatchHistoryItem);
}

function isSearchHistoryList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>(() =>
    safeGet(WATCH_HISTORY_KEY, [], isWatchHistoryList)
  );

  const recordWatch = useCallback((item: Omit<WatchHistoryItem, 'watched_at'>) => {
    setHistory((prev) => {
      const next = [
        { ...item, watched_at: Date.now() },
        ...prev.filter((h) => h.id !== item.id),
      ].slice(0, MAX_WATCH_HISTORY);
      safeSet(WATCH_HISTORY_KEY, next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((id: number) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      safeSet(WATCH_HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    safeRemove(WATCH_HISTORY_KEY);
  }, []);

  return { history, recordWatch, removeFromHistory, clearHistory };
}

export function useSearchHistory() {
  const [searches, setSearches] = useState<string[]>(() =>
    safeGet(SEARCH_HISTORY_KEY, [], isSearchHistoryList)
  );

  const recordSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    setSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(
        0,
        MAX_SEARCH_HISTORY
      );
      safeSet(SEARCH_HISTORY_KEY, next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setSearches((prev) => {
      const next = prev.filter((s) => s !== query);
      safeSet(SEARCH_HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSearches([]);
    safeRemove(SEARCH_HISTORY_KEY);
  }, []);

  return { searches, recordSearch, removeSearch, clearSearches };
}
