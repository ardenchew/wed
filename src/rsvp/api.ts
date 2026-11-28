import { apiRequest, type Credentials } from '../api/client';
import type { PartyRsvpResponse, RsvpUpdateRequest } from './shared';

export const fetchPartyRsvps = (credentials: Credentials) =>
  apiRequest<PartyRsvpResponse>('GET', '/rsvp', { credentials });

export const savePartyRsvps = (credentials: Credentials, update: RsvpUpdateRequest) =>
  apiRequest<PartyRsvpResponse>('PUT', '/rsvp', { credentials, body: update });
