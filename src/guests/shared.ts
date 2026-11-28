/**
 * Guest types and rules shared by the site and the API Worker. Keep this file free of browser-
 * and Worker-only APIs: both bundles import it.
 */
import { EVENTS } from '../config/events';
import type { GuestPolaroid } from '../types';
import type { PartyMemberRsvp } from '../rsvp/shared';

/** What a signed-in guest gets about themselves (`GET /me`). Never includes passwords. */
export interface GuestProfile {
  slug: string;
  first: string;
  last: string;
  nickname?: string;
  welcomeGreetingText?: string;
  welcomeBodyText?: string;
  welcomeSignatureText?: string;
  /** `polaroids[0]` is the Home page's weekend polaroid; the rest join the gallery loop. */
  polaroids: GuestPolaroid[];
  /** Invited event slugs, in schedule order. */
  events: string[];
  isAdmin: boolean;
}

/** One entry in the public sign-in name list (`GET /guests/names`). */
export interface GuestName {
  slug: string;
  name: string;
}

/** A guest as the admin page sees them: profile, credentials, party and RSVP. */
export interface AdminGuest extends GuestProfile {
  password: string;
  /** Guests sharing a party id can RSVP for each other; null = on their own. */
  partyId: string | null;
  rsvp: Pick<PartyMemberRsvp, 'phone' | 'dietary' | 'responses' | 'updatedAt' | 'updatedBy'>;
  createdAt: string;
  updatedAt: string;
}

/** Body of `POST /admin/guests` and `PUT /admin/guests/:slug`. */
export interface GuestInput {
  first: string;
  last: string;
  nickname: string;
  password: string;
  welcomeGreetingText: string;
  welcomeBodyText: string;
  welcomeSignatureText: string;
  polaroids: GuestPolaroid[];
  events: string[];
  /**
   * Party to put this guest in, named by any guest already in it (joining a guest who is on
   * their own starts a new party with them). null = on their own.
   */
  partyWith: string | null;
}

export const GUEST_LIMITS = {
  name: 60,
  nickname: 60,
  password: 100,
  minPassword: 4,
  welcomeGreeting: 200,
  welcomeBody: 4000,
  welcomeSignature: 200,
  polaroids: 12,
  publicId: 200,
  dateText: 40,
} as const;

/** What the Home page shows when a guest has no personal welcome message. */
export const WELCOME_DEFAULTS = {
  greeting: 'Welcome!',
  body: 'We are so happy to celebrate with you. More details for the weekend are coming soon.',
  signature: 'Much love, Emily and Arden',
} as const;

export function displayName(guest: Pick<GuestProfile, 'first' | 'last'>): string {
  return `${guest.first} ${guest.last}`;
}

/** `Mary-Jane  O'Neil` → `mary_jane_oneil`. Callers add a numeric suffix if it's taken. */
export function slugForName(first: string, last: string): string {
  const slug = `${first} ${last}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'guest';
}

/**
 * Checks and tidies admin form input. Returns the cleaned input, or an error message naming the
 * first problem. The API runs this too, so the page and server always agree.
 */
export function validateGuestInput(input: GuestInput): { value: GuestInput } | { error: string } {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const first = text(input?.first);
  const last = text(input?.last);
  const password = text(input?.password);
  const L = GUEST_LIMITS;

  if (!first || !last) return { error: 'First and last name are required.' };
  if (first.length > L.name || last.length > L.name) return { error: `Names must be under ${L.name} characters.` };
  if (password.length < L.minPassword) return { error: `Password must be at least ${L.minPassword} characters.` };
  if (password.length > L.password) return { error: `Password must be under ${L.password} characters.` };

  const nickname = text(input.nickname);
  const welcomeGreetingText = text(input.welcomeGreetingText);
  const welcomeBodyText = text(input.welcomeBodyText);
  const welcomeSignatureText = text(input.welcomeSignatureText);
  if (nickname.length > L.nickname) return { error: `Nickname must be under ${L.nickname} characters.` };
  if (welcomeGreetingText.length > L.welcomeGreeting) return { error: 'The welcome greeting is too long.' };
  if (welcomeBodyText.length > L.welcomeBody) return { error: 'The welcome message is too long.' };
  if (welcomeSignatureText.length > L.welcomeSignature) return { error: 'The signature is too long.' };

  if (!Array.isArray(input.events)) return { error: 'Invalid events.' };
  const events = [...new Set(input.events)];
  if (events.some((slug) => typeof slug !== 'string' || !EVENTS[slug])) return { error: 'Unknown event.' };

  if (!Array.isArray(input.polaroids)) return { error: 'Invalid polaroids.' };
  if (input.polaroids.length > L.polaroids) return { error: `Up to ${L.polaroids} polaroids.` };
  const polaroids: GuestPolaroid[] = [];
  for (const polaroid of input.polaroids) {
    const publicId = text(polaroid?.publicId);
    const dateText = text(polaroid?.dateText);
    if (!publicId && !dateText) continue; // blank row
    if (!publicId) return { error: 'Each polaroid needs a Cloudinary image id.' };
    if (publicId.length > L.publicId || !/^[\w\-./]+$/.test(publicId)) {
      return { error: `“${publicId}” doesn’t look like a Cloudinary image id.` };
    }
    if (dateText.length > L.dateText) return { error: 'A polaroid date is too long.' };
    polaroids.push({ publicId, dateText });
  }

  const partyWith = typeof input.partyWith === 'string' && input.partyWith ? input.partyWith : null;

  return {
    value: {
      first,
      last,
      nickname,
      password,
      welcomeGreetingText,
      welcomeBodyText,
      welcomeSignatureText,
      polaroids,
      events,
      partyWith,
    },
  };
}
