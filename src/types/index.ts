/**
 * TypeScript type definitions
 */

// User context types
export interface UserContextType {
  user: Guest | null;
  signIn: (guest: Guest) => void;
  signOut: () => void;
}

// Data models
export interface Event {
  slug: string;
  name: string;
  start_time: Date;
  location: string;
  description: string;
  attire?: string;
}

export interface Guest {
  slug: string;
  first: string;
  last: string;
  nickname?: string;
  party?: string[]; // optional: a list of guest slugs in the party
  events: string[]; // a list of event slugs
}
