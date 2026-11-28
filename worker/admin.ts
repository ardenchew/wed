import {
  slugForName,
  validateGuestInput,
  type AdminGuest,
  type GuestInput,
} from '../src/guests/shared';
import { eventSlugs } from './events';
import { loadGuest, loadGuests, toProfile, type GuestRecord } from './guests';
import { HttpError, placeholders } from './http';
import { loadRsvps } from './rsvp';

export function requireAdmin(guest: GuestRecord): void {
  if (guest.row.is_admin !== 1) throw new HttpError(403, 'Only Emily and Arden can do that.');
}

export async function listAdminGuests(db: D1Database, slugs?: string[]): Promise<AdminGuest[]> {
  const guests = await loadGuests(db, slugs);
  const rsvps = await loadRsvps(db, guests);
  return guests.map((guest, i) => {
    const { phone, dietary, responses, updatedAt, updatedBy } = rsvps[i];
    return {
      ...toProfile(guest),
      password: guest.row.password,
      partyId: guest.row.party_id,
      rsvp: { phone, dietary, responses, updatedAt, updatedBy },
      createdAt: guest.row.created_at,
      updatedAt: guest.row.updated_at,
    };
  });
}

async function cleanInput(db: D1Database, body: GuestInput): Promise<GuestInput> {
  const result = validateGuestInput(body, await eventSlugs(db));
  if ('error' in result) throw new HttpError(400, result.error);
  return result.value;
}

/**
 * Makes `slug`'s party exactly `slug` + `members`. Keeps the guest's current party id when they
 * have one (otherwise starts a new party), moves the chosen members into it, and takes anyone
 * else out of it. Returns the party id for `slug` (null = on their own) and the statements that
 * update everyone else; run them after the guest's own row is written.
 */
async function resolveParty(
  db: D1Database,
  slug: string,
  currentPartyId: string | null,
  members: string[],
): Promise<{ partyId: string | null; statements: D1PreparedStatement[] }> {
  const others = members.filter((member) => member !== slug);
  if (others.length === 0) return { partyId: null, statements: [] };

  const { results } = await db
    .prepare(`SELECT slug FROM guests WHERE slug IN (${placeholders(others.length)})`)
    .bind(...others)
    .all<{ slug: string }>();
  if (results.length !== others.length) {
    throw new HttpError(400, 'One of the chosen party members isn’t on the guest list. Reload and try again.');
  }

  const partyId = currentPartyId ?? `party_${crypto.randomUUID()}`;
  const everyone = [slug, ...others];
  return {
    partyId,
    statements: [
      db
        .prepare(
          `UPDATE guests SET party_id = NULL
           WHERE party_id = ? AND slug NOT IN (${placeholders(everyone.length)})`,
        )
        .bind(partyId, ...everyone),
      db
        .prepare(`UPDATE guests SET party_id = ? WHERE slug IN (${placeholders(others.length)})`)
        .bind(partyId, ...others),
    ],
  };
}

/** Replaces a guest's invitations and polaroids with the ones in `input`. */
function detailStatements(db: D1Database, slug: string, input: GuestInput): D1PreparedStatement[] {
  return [
    db.prepare('DELETE FROM guest_events WHERE guest_slug = ?').bind(slug),
    db.prepare('DELETE FROM guest_polaroids WHERE guest_slug = ?').bind(slug),
    ...input.events.map((event) =>
      db.prepare('INSERT INTO guest_events (guest_slug, event_slug) VALUES (?, ?)').bind(slug, event),
    ),
    ...input.polaroids.map((polaroid, position) =>
      db
        .prepare(
          'INSERT INTO guest_polaroids (guest_slug, position, public_id, date_text) VALUES (?, ?, ?, ?)',
        )
        .bind(slug, position, polaroid.publicId, polaroid.dateText),
    ),
  ];
}

/** Someone left behind alone in a party is simply on their own again. */
function dissolveSoloParties(db: D1Database): D1PreparedStatement {
  return db.prepare(
    `UPDATE guests SET party_id = NULL
     WHERE party_id IN (SELECT party_id FROM guests WHERE party_id IS NOT NULL
                        GROUP BY party_id HAVING count(*) = 1)`,
  );
}

async function uniqueSlug(db: D1Database, first: string, last: string): Promise<string> {
  const base = slugForName(first, last);
  const { results } = await db
    .prepare("SELECT slug FROM guests WHERE slug = ? OR slug LIKE ? || '\\_%' ESCAPE '\\'")
    .bind(base, base)
    .all<{ slug: string }>();
  const taken = new Set(results.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

export async function createGuest(db: D1Database, body: GuestInput): Promise<AdminGuest> {
  const input = await cleanInput(db, body);
  const slug = await uniqueSlug(db, input.first, input.last);
  const { partyId, statements: partyStatements } = await resolveParty(db, slug, null, input.partyMembers);
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO guests
           (slug, first, last, nickname, password, is_admin, party_id,
            welcome_greeting, welcome_body, welcome_signature, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        slug,
        input.first,
        input.last,
        input.nickname || null,
        input.password,
        partyId,
        input.welcomeGreetingText || null,
        input.welcomeBodyText || null,
        input.welcomeSignatureText || null,
        now,
        now,
      ),
    ...partyStatements,
    ...detailStatements(db, slug, input),
    dissolveSoloParties(db),
  ]);

  const [created] = await listAdminGuests(db, [slug]);
  return created;
}

export async function updateGuest(db: D1Database, slug: string, body: GuestInput): Promise<AdminGuest> {
  const existing = await loadGuest(db, slug);
  if (!existing) throw new HttpError(404, 'That guest no longer exists.');
  const input = await cleanInput(db, body);
  const { partyId, statements: partyStatements } = await resolveParty(
    db,
    slug,
    existing.row.party_id,
    input.partyMembers,
  );

  await db.batch([
    db
      .prepare(
        `UPDATE guests SET
           first = ?, last = ?, nickname = ?, password = ?, party_id = ?,
           welcome_greeting = ?, welcome_body = ?, welcome_signature = ?, updated_at = ?
         WHERE slug = ?`,
      )
      .bind(
        input.first,
        input.last,
        input.nickname || null,
        input.password,
        partyId,
        input.welcomeGreetingText || null,
        input.welcomeBodyText || null,
        input.welcomeSignatureText || null,
        new Date().toISOString(),
        slug,
      ),
    ...partyStatements,
    ...detailStatements(db, slug, input),
    dissolveSoloParties(db),
  ]);

  const [updated] = await listAdminGuests(db, [slug]);
  return updated;
}

/** Removes a guest and everything about them, including their RSVP. Admins can't be removed. */
export async function deleteGuest(db: D1Database, slug: string): Promise<void> {
  const guest = await loadGuest(db, slug);
  if (!guest) throw new HttpError(404, 'That guest no longer exists.');
  if (guest.row.is_admin === 1) throw new HttpError(400, 'Emily and Arden can’t be removed.');

  await db.batch([
    db.prepare('DELETE FROM event_rsvps WHERE guest_slug = ?').bind(slug),
    db.prepare('DELETE FROM guest_rsvps WHERE guest_slug = ?').bind(slug),
    db.prepare('DELETE FROM guest_events WHERE guest_slug = ?').bind(slug),
    db.prepare('DELETE FROM guest_polaroids WHERE guest_slug = ?').bind(slug),
    db.prepare('DELETE FROM guests WHERE slug = ?').bind(slug),
    dissolveSoloParties(db),
  ]);
}
