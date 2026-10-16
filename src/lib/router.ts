import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart] = hash.split('?');
  const path = pathPart || '/';
  const query: Record<string, string> = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => {
      query[k] = v;
    });
  }
  return { path, query, params: {} };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function matchRoute(route: Route): {
  page: 'home' | 'movie' | 'tv' | 'search' | 'watchlist' | 'browse';
  id?: number;
  query?: string;
} {
  const parts = route.path.split('/').filter(Boolean);
  if (parts.length === 0) return { page: 'home' };
  if (parts[0] === 'movie' && parts[1]) return { page: 'movie', id: Number(parts[1]) };
  if (parts[0] === 'tv' && parts[1]) return { page: 'tv', id: Number(parts[1]) };
  if (parts[0] === 'search') return { page: 'search', query: route.query.q || '' };
  if (parts[0] === 'watchlist') return { page: 'watchlist' };
  if (parts[0] === 'browse') return { page: 'browse' };
  return { page: 'home' };
}
