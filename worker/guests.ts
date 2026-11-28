import type { GuestName, GuestProfile } from '../src/guests/shared';
import { displayName } from '../src/guests/shared';
import type { GuestPolaroid } from '../src/types';
import { HttpError, placeholders } from './http';

export interface GuestRow {
  slug: string;
  first: string;
  last: string;
  nickname: string | null;
  password: string;
  is_admin: number;
  party_id: string | null;
  welcome_greeting: string | null;
  welcome_body: string | null;
  welcome_signature: string | null;
  created_at: string;
  updated_at: string;
}

/** A guest row plus their invitations (in schedule order) and polaroids (in display order). */
export interface GuestRecord {
  row: GuestRow;
  events: string[];
  polaroids: GuestPolaroid[];
}

interface GuestEventRow {
  guest_slug: string;
  event_slug: string;
}

interface PolaroidRow {
  guest_slug: string;
  public_id: string;
  date_text: string;
}

/** Loads the given guests (or everyone, when `slugs` is omitted), ordered by last then first name. */
export async function loadGuests(db: D1Database, slugs?: string[]): Promise<GuestRecord[]> {
  if (slugs && slugs.length === 0) return [];
  const filter = slugs ? `WHERE guest_slug IN (${placeholders(slugs.length)})` : '';
  const binds = slugs ?? [];
  const [guests, events, polaroids] = await db.batch<GuestRow | GuestEventRow | PolaroidRow>([
    db
      .prepare(
        `SELECT * FROM guests ${slugs ? `WHERE slug IN (${placeholders(slugs.length)})` : ''}
         ORDER BY last COLLATE NOCASE, first COLLATE NOCASE`,
      )
      .bind(...binds),
    // Joined to events for schedule order (and so an invitation always names a real event).
    db
      .prepare(
        `SELECT ge.guest_slug, ge.event_slug FROM guest_events ge
         JOIN events e ON e.slug = ge.event_slug
         ${slugs ? `WHERE ge.guest_slug IN (${placeholders(slugs.length)})` : ''}
         ORDER BY e.start_time, e.slug`,
      )
      .bind(...binds),
    db
      .prepare(`SELECT guest_slug, public_id, date_text FROM guest_polaroids ${filter} ORDER BY position`)
      .bind(...binds),
  ]);

  const eventsBySlug = new Map<string, string[]>();
  for (const row of events.results as GuestEventRow[]) {
    eventsBySlug.set(row.guest_slug, [...(eventsBySlug.get(row.guest_slug) ?? []), row.event_slug]);
  }
  const polaroidsBySlug = new Map<string, GuestPolaroid[]>();
  for (const row of polaroids.results as PolaroidRow[]) {
    polaroidsBySlug.set(row.guest_slug, [
      ...(polaroidsBySlug.get(row.guest_slug) ?? []),
      { publicId: row.public_id, dateText: row.date_text },
    ]);
  }

  return (guests.results as GuestRow[]).map((row) => ({
    row,
    events: eventsBySlug.get(row.slug) ?? [],
    polaroids: polaroidsBySlug.get(row.slug) ?? [],
  }));
}

export async function loadGuest(db: D1Database, slug: string): Promise<GuestRecord | null> {
  const [guest] = await loadGuests(db, [slug]);
  return guest ?? null;
}

export function toProfile({ row, events, polaroids }: GuestRecord): GuestProfile {
  return {
    slug: row.slug,
    first: row.first,
    last: row.last,
    nickname: row.nickname ?? undefined,
    welcomeGreetingText: row.welcome_greeting ?? undefined,
    welcomeBodyText: row.welcome_body ?? undefined,
    welcomeSignatureText: row.welcome_signature ?? undefined,
    polaroids,
    events,
    isAdmin: row.is_admin === 1,
  };
}

/** Everyone's display name, for the sign-in search. Public: it reveals names, nothing else. */
export async function loadGuestNames(db: D1Database): Promise<GuestName[]> {
  const { results } = await db
    .prepare('SELECT slug, first, last FROM guests ORDER BY first COLLATE NOCASE, last COLLATE NOCASE')
    .all<Pick<GuestRow, 'slug' | 'first' | 'last'>>();
  return results.map((row) => ({ slug: row.slug, name: displayName(row) }));
}

/** The guest named by `Authorization: Basic base64(slug:password)`, or a 401. */
export async function authenticate(request: Request, db: D1Database): Promise<GuestRecord> {
  const signInAgain = new HttpError(401, 'Please sign in again.');
  const match = /^Basic\s+(.+)$/i.exec(request.headers.get('Authorization') ?? '');
  if (!match) throw signInAgain;

  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)));
  } catch {
    throw signInAgain;
  }
  const separator = decoded.indexOf(':');
  if (separator < 1) throw signInAgain;

  const guest = await loadGuest(db, decoded.slice(0, separator));
  // Same message for an unknown guest and a wrong password; the sign-in page words it for people.
  if (!guest || guest.row.password !== decoded.slice(separator + 1)) throw signInAgain;
  return guest;
}

/** The guest first, then everyone else sharing their party, by name. */
export async function partyMembers(db: D1Database, guest: GuestRow): Promise<string[]> {
  if (!guest.party_id) return [guest.slug];
  const { results } = await db
    .prepare(
      `SELECT slug FROM guests WHERE party_id = ? AND slug != ?
       ORDER BY first COLLATE NOCASE, last COLLATE NOCASE`,
    )
    .bind(guest.party_id, guest.slug)
    .all<{ slug: string }>();
  return [guest.slug, ...results.map((row) => row.slug)];
}
