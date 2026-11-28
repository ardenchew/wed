import type { GuestProfile as Guest } from '../guests/shared';

export interface UserContextType {
  user: Guest | null;
  /** The signed-in guest's password, sent with every API call. */
  password: string | null;
  signIn: (guest: Guest, password: string) => void;
  signOut: () => void;
}

export interface Event {
  slug: string;
  name: string;
  start_time: Date;
  location: string;
  description: string;
  attire?: string;
  image?: string;
  map_link?: string;
}

export interface GuestPolaroid {
  /** Cloudinary public_id, e.g. `wed/guests/debbie_kwan/1`. */
  publicId: string;
  dateText: string;
}

/** The signed-in guest, as the API returns them (`GET /me`). */
export type { GuestProfile as Guest } from '../guests/shared';
