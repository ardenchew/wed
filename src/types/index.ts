export interface UserContextType {
  user: Guest | null;
  /** The signed-in guest's password, sent to the RSVP API. */
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

export interface Guest {
  slug: string;
  first: string;
  last: string;
  nickname?: string;
  welcomeGreetingText?: string;
  welcomeBodyText?: string;
  welcomeSignatureText?: string;
  /**
   * Per-guest polaroids. `polaroids[0]` is the weekend hero polaroid;
   * `polaroids[1+]` are appended to the gallery loop.
   */
  polaroids?: GuestPolaroid[];
  party?: string[]; // optional: a list of guest slugs in the party
  events: string[]; // a list of event slugs
}
