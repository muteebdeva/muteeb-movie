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
  /** TV only: last watched season/episode */
  season?: number;
  episode?: number;
  /** Genuine playback position from the provider's PLAYER_EVENT (seconds) */
  progress?: number;
  /** Total duration from the provider's PLAYER_EVENT (seconds) */
  duration?: number;
}

const WATCH_HISTORY_KEY = 'muteeb_movie_watch_history';
const SEARCH_HISTORY_KEY = 'muteeb_movie_search_history';
const MAX_WATCH_HISTORY = 20;
const MAX_SEARCH_HISTORY = 10;

function optNumber(v: unknown): boolean {
  return v === undefined || (typeof v === 'number' && Number.isFinite(v));
}

function isWatchHistoryItem(v: unknown): v is WatchHistoryItem {
  return (
    isRecord(v) &&
    typeof v.id === 'number' &&
    (v.media_type === 'movie' || v.media_type === 'tv') &&
    typeof v.title === 'string' &&
    optNumber(v.season) &&
    optNumber(v.episode) &&
    optNumber(v.progress) &&
    optNumber(v.duration)
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
      const existing = prev.find((h) => h.id === item.id);
      // Keep a saved position only when it's for this exact title/episode —
      // a different episode must not inherit another episode's position.
      const sameSlice =
        item.media_type !== 'tv' ||
        (existing?.season === item.season && existing?.episode === item.episode);
      const next = [
        {
          ...item,
          progress: sameSlice ? existing?.progress : undefined,
          duration: sameSlice ? existing?.duration : undefined,
          watched_at: Date.now(),
        },
        ...prev.filter((h) => h.id !== item.id),
      ].slice(0, MAX_WATCH_HISTORY);
      safeSet(WATCH_HISTORY_KEY, next);
      return next;
    });
  }, []);

  /**
   * Persist a genuine playback position reported by the provider.
   * Ignores positions at the very start and near the very end.
   */
  const updateProgress = useCallback((id: number, progress: number, duration: number) => {
    if (!Number.isFinite(progress) || !Number.isFinite(duration) || duration <= 0) return;
    if (progress < 5) return;
    if (progress > duration * 0.97) return; // essentially finished
    setHistory((prev) => {
      const idx = prev.findIndex((h) => h.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], progress: Math.floor(progress), duration: Math.floor(duration) };
      safeSet(WATCH_HISTORY_KEY, next);
      return next;
    });
  }, []);

  /** Drop the saved position (e.g. the title was watched to the end). */
  const clearResume = useCallback((id: number) => {
    setHistory((prev) => {
      const idx = prev.findIndex((h) => h.id === id);
      if (idx === -1 || (prev[idx].progress == null && prev[idx].duration == null)) return prev;
      const next = [...prev];
      const entry = { ...next[idx] };
      delete entry.progress;
      delete entry.duration;
      next[idx] = entry;
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

  return { history, recordWatch, updateProgress, clearResume, removeFromHistory, clearHistory };
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
