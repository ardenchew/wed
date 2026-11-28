/**
 * RSVP types and rules shared by the site and the API Worker (`worker/index.ts`).
 * Keep this file free of browser- and Worker-only APIs: both bundles import it.
 */
import { EVENTS } from '../config/events';
import { GUESTS } from '../config/guests';

/** One party member as the API returns them: who they are, what they're invited to, what they said. */
export interface PartyMemberRsvp {
  slug: string;
  first: string;
  last: string;
  /** Invited event slugs, in schedule order. */
  events: string[];
  /** Stored phone number (E.164-ish, e.g. `+14155550123`), or null if never given. */
  phone: string | null;
  /** Free-text dietary restrictions, or null if none given. */
  dietary: string | null;
  /** Event slug → attending. An event missing here has not been answered yet. */
  responses: Record<string, boolean>;
  updatedAt: string | null;
  /** Slug of whoever last saved this member's RSVP (themselves or a party member). */
  updatedBy: string | null;
}

export interface PartyRsvpResponse {
  /** The signed-in guest. */
  self: string;
  /** The signed-in guest first, then the rest of their party. */
  party: PartyMemberRsvp[];
}

export interface GuestRsvpUpdate {
  slug: string;
  /** Required (here or already stored) whenever any response is `true`. */
  phone?: string;
  /** Replaces the stored value when present; an empty string clears it. Omit to leave it as is. */
  dietary?: string;
  /** Only the events listed are changed; others keep their stored answer. */
  responses: Record<string, boolean>;
}

export interface RsvpUpdateRequest {
  guests: GuestRsvpUpdate[];
}

export interface RsvpErrorBody {
  error: string;
  /** Guest the error is about, when it's about one. */
  guest?: string;
}

/**
 * - `yes`: attending every invited event
 * - `partial`: attending some events (the rest declined or not answered yet)
 * - `no`: declined every invited event
 * - `pending`: hasn't said yes to anything and still has unanswered events
 */
export type RsvpStatus = 'yes' | 'partial' | 'no' | 'pending';

export function rsvpStatus(member: Pick<PartyMemberRsvp, 'events' | 'responses'>): RsvpStatus {
  const answers = member.events.map((slug) => member.responses[slug]);
  const yes = answers.filter((a) => a === true).length;
  const no = answers.filter((a) => a === false).length;
  if (answers.length > 0 && yes === answers.length) return 'yes';
  if (yes > 0) return 'partial';
  if (answers.length > 0 && no === answers.length) return 'no';
  return 'pending';
}

/** Event slugs sorted by start time — the order the schedule shows them in. */
export function sortEventSlugs(slugs: string[]): string[] {
  return slugs
    .filter((slug) => EVENTS[slug])
    .sort((a, b) => EVENTS[a].start_time.getTime() - EVENTS[b].start_time.getTime());
}

/**
 * The guest plus everyone in their party. `party` lists are kept per guest in
 * `src/config/guests.ts`; membership counts in either direction, so a one-sided listing still
 * groups both guests together.
 */
export function partyOf(slug: string): string[] {
  const guest = GUESTS[slug];
  if (!guest) return [];
  const members = new Set<string>([slug, ...(guest.party ?? [])]);
  for (const other of Object.values(GUESTS)) {
    if (other.party?.includes(slug)) members.add(other.slug);
  }
  return [...members].filter((member) => GUESTS[member]);
}

/**
 * Normalises a phone number for storage, or returns null if it doesn't look like one.
 * 10 digits are treated as US/Canada (`+1`); anything else needs 11–15 digits, with or without `+`.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && !trimmed.startsWith('+')) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Longest dietary-restrictions answer the API accepts (the modal's input enforces it too). */
export const DIETARY_MAX_LENGTH = 200;

/** `+14155550123` → `(415) 555-0123`; other countries are shown as stored. */
export function formatPhone(phone: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}
