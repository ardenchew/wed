import type { AdminGuest, GuestInput, GuestName, GuestProfile } from '../guests/shared';
import { apiRequest, type Credentials } from './client';

/** Everyone's display name, for the sign-in search. */
export const fetchGuestNames = () => apiRequest<GuestName[]>('GET', '/guests/names');

/** The signed-in guest's profile. A 401 means the slug/password pair is wrong. */
export const fetchMe = (credentials: Credentials) => apiRequest<GuestProfile>('GET', '/me', { credentials });

export const fetchAdminGuests = (credentials: Credentials) =>
  apiRequest<AdminGuest[]>('GET', '/admin/guests', { credentials });

export const createGuest = (credentials: Credentials, input: GuestInput) =>
  apiRequest<AdminGuest>('POST', '/admin/guests', { credentials, body: input });

export const updateGuest = (credentials: Credentials, slug: string, input: GuestInput) =>
  apiRequest<AdminGuest>('PUT', `/admin/guests/${encodeURIComponent(slug)}`, { credentials, body: input });

export const deleteGuest = (credentials: Credentials, slug: string) =>
  apiRequest<{ deleted: string }>('DELETE', `/admin/guests/${encodeURIComponent(slug)}`, { credentials });
