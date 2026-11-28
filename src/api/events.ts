import type { AdminEvent, ApiEvent, EventInput } from '../events/shared';
import type { Event } from '../types';
import { apiRequest, type Credentials } from './client';

/** The API's event with its times parsed, as the pages use it. */
export function toEvent(event: ApiEvent): Event {
  return {
    slug: event.slug,
    name: event.name,
    start_time: new Date(event.start_time),
    end_time: event.end_time ? new Date(event.end_time) : undefined,
    location: event.location,
    description: event.description,
    attire: event.attire ?? undefined,
    image: event.image ?? undefined,
    map_link: event.map_link ?? undefined,
  };
}

/** The events the signed-in guest is invited to, in schedule order. */
export const fetchMyEvents = (credentials: Credentials) =>
  apiRequest<ApiEvent[]>('GET', '/events', { credentials });

export const fetchAdminEvents = (credentials: Credentials) =>
  apiRequest<AdminEvent[]>('GET', '/admin/events', { credentials });

export const createEvent = (credentials: Credentials, input: EventInput) =>
  apiRequest<AdminEvent>('POST', '/admin/events', { credentials, body: input });

export const updateEvent = (credentials: Credentials, slug: string, input: EventInput) =>
  apiRequest<AdminEvent>('PUT', `/admin/events/${encodeURIComponent(slug)}`, { credentials, body: input });

export const deleteEvent = (credentials: Credentials, slug: string) =>
  apiRequest<{ deleted: string }>('DELETE', `/admin/events/${encodeURIComponent(slug)}`, { credentials });
