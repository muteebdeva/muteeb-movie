// Client for the admin backend (/api/*). Cookies (httpOnly session) are sent
// with every request via credentials: 'include'.
export class AdminApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

async function req(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (res.status === 204) return null;
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: unknown;
    code?: string;
    message?: string;
  } | null;
  if (!res.ok || !data || data.ok !== true) {
    throw new AdminApiError(
      res.status,
      data?.code ?? 'unknown',
      data?.message ?? `Request failed (${res.status})`
    );
  }
  return data.data;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
}

export const adminApi = {
  me: () => req('/api/admin/me') as Promise<AdminUser>,
  login: (email: string, password: string) =>
    req('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => req('/api/admin/logout', { method: 'POST' }),

  titles: {
    list: (params: { collection?: string; tmdb_id?: number; limit?: number; offset?: number } = {}) =>
      req(`/api/admin/titles${qs(params)}`) as Promise<{ titles: CuratedTitle[]; limit: number; offset: number }>,
    add: (body: Record<string, unknown>) =>
      req('/api/admin/titles', { method: 'POST', body: JSON.stringify(body) }) as Promise<CuratedTitle>,
    update: (body: Record<string, unknown>) =>
      req('/api/admin/titles', { method: 'PATCH', body: JSON.stringify(body) }) as Promise<CuratedTitle>,
    remove: (id: string) => req(`/api/admin/titles${qs({ id })}`, { method: 'DELETE' }),
  },
  collections: {
    list: () => req('/api/admin/collections') as Promise<Collection[]>,
    save: (body: Record<string, unknown>, isNew: boolean) =>
      req('/api/admin/collections', { method: isNew ? 'POST' : 'PATCH', body: JSON.stringify(body) }),
    remove: (key: string) => req(`/api/admin/collections${qs({ key })}`, { method: 'DELETE' }),
  },
  sections: {
    list: () => req('/api/admin/sections') as Promise<Section[]>,
    save: (sections: Partial<Section>[]) =>
      req('/api/admin/sections', { method: 'PATCH', body: JSON.stringify({ sections }) }),
  },
  settings: {
    get: () => req('/api/admin/settings') as Promise<Record<string, unknown>>,
    update: (key: string, value: Record<string, unknown>) =>
      req('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ key, value }) }),
  },
  providers: {
    list: () => req('/api/admin/providers') as Promise<Provider[]>,
    update: (body: Record<string, unknown>) =>
      req('/api/admin/providers', { method: 'PATCH', body: JSON.stringify(body) }) as Promise<Provider>,
  },
  analytics: (days = 30) => req(`/api/admin/analytics${qs({ days })}`) as Promise<AnalyticsData>,
  audit: (params: { limit?: number; offset?: number; action?: string } = {}) =>
    req(`/api/admin/audit${qs(params)}`) as Promise<{ entries: AuditEntry[]; limit: number; offset: number }>,
};

export interface CuratedTitle {
  id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  collection_key: string;
  sort_order: number;
  is_featured: boolean;
  is_hidden: boolean;
  custom_title: string | null;
  custom_overview: string | null;
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
  created_at: string;
}

export interface Collection {
  key: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface Section {
  section_key: string;
  title: string;
  source: string;
  sort_order: number;
  is_visible: boolean;
}

export interface Provider {
  provider_key: string;
  display_name: string;
  is_enabled: boolean;
  priority: number;
  notes: string | null;
  updated_at: string;
}

export interface AnalyticsData {
  window_days: number;
  measured_from: string | null;
  curated: { movies: number; tv: number; note: string };
  totals: { events: number; unique_sessions: number; by_type: Record<string, number> };
  timeseries: ({ date: string } & Record<string, number | string>)[];
  top_titles: { tmdb_id: number; media_type: string; plays: number; opens: number }[];
  recent_searches: { query: string; zero_results: boolean; at: string }[];
  recent_errors: { type: string; at: string; detail: string }[];
  notes: string[];
}

export interface AuditEntry {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export function apiErrorMessage(e: unknown): string {
  if (e instanceof AdminApiError) {
    if (e.code === 'db_not_configured')
      return 'Admin backend not configured yet. Follow docs/admin/SETUP.md to connect Supabase.';
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}
