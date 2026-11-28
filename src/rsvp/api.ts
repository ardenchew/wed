import type { PartyRsvpResponse, RsvpErrorBody, RsvpUpdateRequest } from './shared';

const API_URL = import.meta.env.VITE_RSVP_API_URL;

export class RsvpApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Guest slug the error is about, when the API says. */
    readonly guest?: string,
  ) {
    super(message);
  }
}

export interface RsvpCredentials {
  slug: string;
  password: string;
}

async function request(
  method: 'GET' | 'PUT',
  credentials: RsvpCredentials,
  body?: RsvpUpdateRequest,
): Promise<PartyRsvpResponse> {
  if (!API_URL) throw new RsvpApiError('RSVPs aren’t available right now.', 0);

  // btoa only takes Latin-1, so encode as UTF-8 bytes first.
  const token = btoa(
    String.fromCharCode(...new TextEncoder().encode(`${credentials.slug}:${credentials.password}`)),
  );

  let response: Response;
  try {
    response = await fetch(`${API_URL.replace(/\/+$/, '')}/rsvp`, {
      method,
      headers: {
        Authorization: `Basic ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new RsvpApiError('Couldn’t reach the RSVP service. Check your connection and try again.', 0);
  }

  const payload = (await response.json().catch(() => null)) as PartyRsvpResponse | RsvpErrorBody | null;
  if (!response.ok || !payload || 'error' in payload) {
    const error = payload && 'error' in payload ? payload : null;
    throw new RsvpApiError(
      error?.error ?? 'Something went wrong. Please try again.',
      response.status,
      error?.guest,
    );
  }
  return payload;
}

export const fetchPartyRsvps = (credentials: RsvpCredentials) => request('GET', credentials);

export const savePartyRsvps = (credentials: RsvpCredentials, update: RsvpUpdateRequest) =>
  request('PUT', credentials, update);
