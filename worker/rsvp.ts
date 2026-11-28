import { EVENTS } from '../src/config/events';
import { displayName } from '../src/guests/shared';
import {
  DIETARY_MAX_LENGTH,
  normalizePhone,
  type PartyMemberRsvp,
  type PartyRsvpResponse,
  type RsvpUpdateRequest,
} from '../src/rsvp/shared';
import { loadGuests, partyMembers, type GuestRecord } from './guests';
import { HttpError, placeholders } from './http';

interface GuestRsvpRow {
  guest_slug: string;
  phone: string | null;
  dietary: string | null;
  updated_at: string;
  updated_by: string;
}

interface EventRsvpRow {
  guest_slug: string;
  event_slug: string;
  attending: number;
}

/** Each guest's RSVP, combined with what they're invited to (answers for other events are ignored). */
export async function loadRsvps(db: D1Database, guests: GuestRecord[]): Promise<PartyMemberRsvp[]> {
  if (guests.length === 0) return [];
  const slugs = guests.map((guest) => guest.row.slug);
  const [guestRows, eventRows] = await db.batch<GuestRsvpRow | EventRsvpRow>([
    db.prepare(`SELECT * FROM guest_rsvps WHERE guest_slug IN (${placeholders(slugs.length)})`).bind(...slugs),
    db
      .prepare(
        `SELECT guest_slug, event_slug, attending FROM event_rsvps
         WHERE guest_slug IN (${placeholders(slugs.length)})`,
      )
      .bind(...slugs),
  ]);

  const stored = new Map((guestRows.results as GuestRsvpRow[]).map((row) => [row.guest_slug, row]));
  return guests.map(({ row, events }): PartyMemberRsvp => {
    const responses: Record<string, boolean> = {};
    for (const answer of eventRows.results as EventRsvpRow[]) {
      if (answer.guest_slug === row.slug && events.includes(answer.event_slug)) {
        responses[answer.event_slug] = answer.attending === 1;
      }
    }
    const rsvp = stored.get(row.slug);
    return {
      slug: row.slug,
      first: row.first,
      last: row.last,
      events,
      phone: rsvp?.phone ?? null,
      dietary: rsvp?.dietary ?? null,
      responses,
      updatedAt: rsvp?.updated_at ?? null,
      updatedBy: rsvp?.updated_by ?? null,
    };
  });
}

export async function loadParty(db: D1Database, self: GuestRecord): Promise<PartyRsvpResponse> {
  const slugs = await partyMembers(db, self.row);
  const records = await loadGuests(db, slugs);
  // loadGuests sorts by name; keep the signed-in guest first.
  const ordered = slugs
    .map((slug) => records.find((record) => record.row.slug === slug))
    .filter((record): record is GuestRecord => Boolean(record));
  return { self: self.row.slug, party: await loadRsvps(db, ordered) };
}

export async function saveParty(db: D1Database, self: GuestRecord, body: RsvpUpdateRequest): Promise<void> {
  if (!body || !Array.isArray(body.guests) || body.guests.length === 0) {
    throw new HttpError(400, 'Choose at least one guest to RSVP for.');
  }

  const current = new Map((await loadParty(db, self)).party.map((member) => [member.slug, member]));
  const now = new Date().toISOString();
  const by = self.row.slug;
  const statements: D1PreparedStatement[] = [];
  const seen = new Set<string>();

  for (const update of body.guests) {
    const member = current.get(update?.slug);
    if (!member) throw new HttpError(403, 'You can only RSVP for guests in your party.');
    if (seen.has(member.slug)) throw new HttpError(400, 'Each guest can only appear once.', member.slug);
    seen.add(member.slug);

    const name = displayName(member);
    const entries = Object.entries(update.responses ?? {});
    if (entries.length === 0) throw new HttpError(400, `Choose a response for ${name}.`, member.slug);
    for (const [event, attending] of entries) {
      if (!member.events.includes(event) || !EVENTS[event] || typeof attending !== 'boolean') {
        throw new HttpError(400, `${name} isn't invited to that event.`, member.slug);
      }
    }

    let phone = member.phone;
    if (typeof update.phone === 'string' && update.phone.trim() !== '') {
      phone = normalizePhone(update.phone);
      if (!phone) throw new HttpError(400, `Enter a valid phone number for ${name}.`, member.slug);
    }
    const attendingAnything = member.events.some((event) =>
      Object.hasOwn(update.responses, event) ? update.responses[event] : member.responses[event] === true,
    );
    if (attendingAnything && !phone) {
      throw new HttpError(400, `A phone number is required for ${name}.`, member.slug);
    }

    let dietary = member.dietary;
    if (update.dietary !== undefined) {
      if (typeof update.dietary !== 'string' || update.dietary.length > DIETARY_MAX_LENGTH) {
        throw new HttpError(
          400,
          `Keep dietary restrictions for ${name} under ${DIETARY_MAX_LENGTH} characters.`,
          member.slug,
        );
      }
      dietary = update.dietary.trim() || null;
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO guest_rsvps (guest_slug, phone, dietary, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (guest_slug) DO UPDATE SET
             phone = excluded.phone, dietary = excluded.dietary,
             updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
        )
        .bind(member.slug, phone, dietary, now, by),
    );
    for (const [event, attending] of entries) {
      statements.push(
        db
          .prepare(
            `INSERT INTO event_rsvps (guest_slug, event_slug, attending, updated_at, updated_by)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (guest_slug, event_slug) DO UPDATE SET
               attending = excluded.attending, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
          )
          .bind(member.slug, event, attending ? 1 : 0, now, by),
      );
    }
  }

  // D1 runs a batch as a single transaction: either every answer is saved or none are.
  await db.batch(statements);
}
