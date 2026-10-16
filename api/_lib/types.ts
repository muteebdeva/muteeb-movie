// Minimal Vercel function req/res shapes — structural only, no @vercel/node dep.
export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string | string[]): ApiResponse;
  send(body: unknown): void;
}

export type Handler = (req: ApiRequest, res: ApiResponse) => void | Promise<void>;

export function header(
  headers: ApiRequest['headers'],
  name: string
): string | undefined {
  const v = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(v) ? v[0] : v;
}
