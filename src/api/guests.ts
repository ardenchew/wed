import type { AdminGuest, GuestInput, GuestName, GuestProfile } from '../guests/shared';
import { apiRequest, type Credentials } from './client';

/** The guests a typed sign-in name could mean: none, one, or a few to choose from. */
export const lookupGuests = (name: string) => apiRequest<GuestName[]>('POST', '/guests/lookup', { body: { name } });

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
