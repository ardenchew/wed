/**
 * TypeScript type definitions
 */

// User context types
export interface UserContextType {
  user: Guest | null;
  signIn: (guest: Guest) => void;
  signOut: () => void;
}

// Redis response types
export interface RedisResponse<T = string> {
  result: T | null;
  error?: string;
}

export interface RedisError {
  error: string;
  message?: string;
}

// Data models
export enum RsvpResponse {
  YES = 'YES',
  NO = 'NO',
}

export interface RsvpEvent {
  event_slug: string;
  response: RsvpResponse;
}

export interface Rsvp {
  guest: string; // guest slug
  events: RsvpEvent[];
  diet: string;
}

export interface Event {
  slug: string;
  name: string;
  start_time: Date;
  location: string;
  description: string;
  attire?: string;
  rsvpable: boolean;
}

export interface Guest {
  slug: string;
  first: string;
  last: string;
  nickname?: string;
  party?: string[]; // optional: a list of guest slugs in the party
  events: string[]; // a list of event slugs
}
