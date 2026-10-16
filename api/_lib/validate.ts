// Small input validators for admin API routes. Throw ValidationError on bad input.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

type StrOpts = { required?: boolean; max?: number; name?: string };

export function vStr(v: unknown, opts: StrOpts = {}): string | null {
  const name = opts.name ?? 'value';
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new ValidationError(`${name} is required`);
    return null;
  }
  if (typeof v !== 'string') throw new ValidationError(`${name} must be a string`);
  const s = v.trim();
  if (opts.required && !s) throw new ValidationError(`${name} is required`);
  if (opts.max !== undefined && s.length > opts.max)
    throw new ValidationError(`${name} must be at most ${opts.max} characters`);
  return s;
}

export function vInt(
  v: unknown,
  opts: { required?: boolean; min?: number; max?: number; name?: string } = {}
): number | null {
  const name = opts.name ?? 'value';
  if (v === undefined || v === null || v === '') {
    if (opts.required) throw new ValidationError(`${name} is required`);
    return null;
  }
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n)) throw new ValidationError(`${name} must be an integer`);
  if (opts.min !== undefined && n < opts.min)
    throw new ValidationError(`${name} must be >= ${opts.min}`);
  if (opts.max !== undefined && n > opts.max)
    throw new ValidationError(`${name} must be <= ${opts.max}`);
  return n;
}

export function vBool(v: unknown, name = 'value'): boolean | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'boolean') throw new ValidationError(`${name} must be a boolean`);
  return v;
}

export function vOneOf<T extends string>(v: unknown, list: readonly T[], name = 'value'): T | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !(list as readonly string[]).includes(v))
    throw new ValidationError(`${name} must be one of: ${list.join(', ')}`);
  return v as T;
}

export function vMediaType(v: unknown): 'movie' | 'tv' | null {
  return vOneOf(v, ['movie', 'tv'] as const, 'media_type');
}

export function vEmail(v: unknown): string {
  const s = vStr(v, { required: true, max: 254, name: 'email' }) as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ValidationError('email is not valid');
  return s.toLowerCase();
}

export function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Request body must be a JSON object');
  return body as Record<string, unknown>;
}
