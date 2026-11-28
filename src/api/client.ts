import type { ApiErrorBody } from './types';

const API_URL = import.meta.env.VITE_RSVP_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the API couldn't be reached at all. */
    readonly status: number,
    /** Guest slug the error is about, when the API says. */
    readonly guest?: string,
  ) {
    super(message);
  }
}

export interface Credentials {
  slug: string;
  password: string;
}

interface RequestOptions {
  credentials?: Credentials;
  body?: unknown;
}

/** Calls the API Worker and returns its JSON, or throws an ApiError with a readable message. */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  { credentials, body }: RequestOptions = {},
): Promise<T> {
  if (!API_URL) throw new ApiError('The site’s service isn’t available right now.', 0);

  const headers: Record<string, string> = {};
  if (credentials) {
    // btoa only takes Latin-1, so encode as UTF-8 bytes first.
    const bytes = new TextEncoder().encode(`${credentials.slug}:${credentials.password}`);
    headers.Authorization = `Basic ${btoa(String.fromCharCode(...bytes))}`;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API_URL.replace(/\/+$/, '')}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Couldn’t reach the site’s service. Check your connection and try again.', 0);
  }

  const payload = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok || payload === null) {
    const error = payload as ApiErrorBody | null;
    throw new ApiError(error?.error ?? 'Something went wrong. Please try again.', response.status, error?.guest);
  }
  return payload as T;
}
