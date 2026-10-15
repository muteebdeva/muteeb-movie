/**
 * Hardened localStorage helpers.
 * Reads validate the stored shape before use so a corrupt or foreign value
 * can never crash the app; writes fail silently (private mode, quota).
 */

export function safeGet<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
