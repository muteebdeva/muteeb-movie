import { useEffect, useRef, useState } from 'react';
import { Search, Film, Tv } from 'lucide-react';
import type { Movie } from '@/types';
import { searchMulti, imgUrl } from '@/lib/tmdb';
import { navigate } from '@/lib/router';
import { getTitle, getMediaType, formatYear, getReleaseDate } from '@/lib/utils';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface SearchBoxProps {
  initialQuery?: string;
  onSubmit: (query: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
  inputClassName?: string;
  onNavigate?: () => void;
}

export function SearchBox({
  initialQuery = '',
  onSubmit,
  autoFocus,
  placeholder = 'Search movies, TV shows...',
  inputClassName = '',
  onNavigate,
}: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const debounced = useDebouncedValue(query, 350);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    searchMulti(q, 1)
      .then((data) => {
        if (cancelled) return;
        const items = (data.results || [])
          .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
          .slice(0, 6);
        setSuggestions(items);
        setOpen(items.length > 0);
        setHighlight(-1);
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setOpen(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const goToSuggestion = (movie: Movie) => {
    const type = getMediaType(movie);
    setOpen(false);
    onNavigate?.();
    navigate(`/${type}/${movie.id}`);
  };

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    onNavigate?.();
    onSubmit(trimmed);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlight >= 0 && suggestions[highlight]) {
        goToSuggestion(suggestions[highlight]);
      } else {
        submit(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center">
        <Search className="w-4 h-4 text-zinc-400 ml-3 shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          className={`bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none flex-1 px-2 py-2 ${inputClassName}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="text-zinc-500 hover:text-white px-2 text-lg leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl shadow-black/60 z-50"
        >
          {suggestions.map((s, i) => {
            const type = getMediaType(s);
            const year = formatYear(getReleaseDate(s));
            return (
              <li key={`${s.id}-${s.media_type}`} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToSuggestion(s)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex items-center gap-3 w-full text-left px-3 py-2 transition-colors ${
                    i === highlight ? 'bg-zinc-800' : 'bg-transparent'
                  }`}
                >
                  {s.poster_path ? (
                    <img
                      src={imgUrl(s.poster_path, 'w92')}
                      alt=""
                      className="w-8 h-12 object-cover rounded shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-12 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                      {type === 'tv' ? (
                        <Tv className="w-4 h-4 text-zinc-600" />
                      ) : (
                        <Film className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{getTitle(s)}</p>
                    <p className="text-xs text-zinc-500">
                      {type === 'tv' ? 'TV Series' : 'Movie'}
                      {year && ` · ${year}`}
                      {s.vote_average > 0 && ` · ★ ${s.vote_average.toFixed(1)}`}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(query)}
              className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
            >
              <Search className="w-4 h-4" />
              See all results for “{query.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
