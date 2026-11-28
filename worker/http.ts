import type { ApiErrorBody } from '../src/api/types';

export interface Env {
  DB: D1Database;
  /** The production site's origin; any http://localhost origin is also allowed for development. */
  SITE_ORIGIN: string;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Guest the error is about, when it's about one (lets the page highlight their section). */
    readonly guest?: string,
  ) {
    super(message);
  }
}

export function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });
  const origin = request.headers.get('Origin');
  if (origin && (origin === env.SITE_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return headers;
}

export function json(body: unknown, status: number, headers: Headers): Response {
  const out = new Headers(headers);
  out.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers: out });
}

export function errorResponse(error: unknown, headers: Headers): Response {
  if (error instanceof HttpError) {
    const body: ApiErrorBody = { error: error.message, guest: error.guest };
    return json(body, error.status, headers);
  }
  console.error(error);
  return json({ error: 'Something went wrong. Please try again.' } satisfies ApiErrorBody, 500, headers);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, 'Invalid request.');
  }
}

/** `?, ?, ?` for an IN (…) list. Callers must not pass an empty list. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
