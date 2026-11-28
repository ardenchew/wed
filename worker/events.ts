import {
  slugForEventName,
  validateEventInput,
  type AdminEvent,
  type ApiEvent,
  type CleanEventInput,
  type EventInput,
} from '../src/events/shared';
import { HttpError, placeholders } from './http';

interface EventRow extends ApiEvent {
  created_at: string;
  updated_at: string;
}

function toApiEvent(row: EventRow): ApiEvent {
  return {
    slug: row.slug,
    name: row.name,
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    description: row.description,
    attire: row.attire,
    image: row.image,
    map_link: row.map_link,
  };
}

/** The given events (every event when `slugs` is omitted), in schedule order. */
export async function loadEvents(db: D1Database, slugs?: string[]): Promise<ApiEvent[]> {
  if (slugs && slugs.length === 0) return [];
  const filter = slugs ? `WHERE slug IN (${placeholders(slugs.length)})` : '';
  const { results } = await db
    .prepare(`SELECT * FROM events ${filter} ORDER BY start_time, slug`)
    .bind(...(slugs ?? []))
    .all<EventRow>();
  return results.map(toApiEvent);
}

/** Every event slug, for checking a guest's invitations. */
export async function eventSlugs(db: D1Database): Promise<Set<string>> {
  const { results } = await db.prepare('SELECT slug FROM events').all<{ slug: string }>();
  return new Set(results.map((row) => row.slug));
}

export async function listAdminEvents(db: D1Database, slugs?: string[]): Promise<AdminEvent[]> {
  if (slugs && slugs.length === 0) return [];
  const filter = slugs ? `WHERE slug IN (${placeholders(slugs.length)})` : '';
  const eventFilter = slugs ? `WHERE event_slug IN (${placeholders(slugs.length)})` : '';
  const binds = slugs ?? [];
  const [events, invited, answers] = await db.batch<
    EventRow | { guest_slug: string; event_slug: string; attending?: number }
  >([
    db.prepare(`SELECT * FROM events ${filter} ORDER BY start_time, slug`).bind(...binds),
    db.prepare(`SELECT guest_slug, event_slug FROM guest_events ${eventFilter}`).bind(...binds),
    db.prepare(`SELECT guest_slug, event_slug, attending FROM event_rsvps ${eventFilter}`).bind(...binds),
  ]);

  const invitedBy = new Map<string, string[]>();
  for (const row of invited.results as { guest_slug: string; event_slug: string }[]) {
    invitedBy.set(row.event_slug, [...(invitedBy.get(row.event_slug) ?? []), row.guest_slug]);
  }
  return (events.results as EventRow[]).map((row) => {
    const guests = invitedBy.get(row.slug) ?? [];
    const responses: Record<string, boolean> = {};
    for (const answer of answers.results as { guest_slug: string; event_slug: string; attending: number }[]) {
      // Answers from guests no longer invited are kept but not counted, as on the guest side.
      if (answer.event_slug === row.slug && guests.includes(answer.guest_slug)) {
        responses[answer.guest_slug] = answer.attending === 1;
      }
    }
    return { ...toApiEvent(row), invited: guests, responses, createdAt: row.created_at, updatedAt: row.updated_at };
  });
}

async function cleanInput(db: D1Database, body: EventInput): Promise<CleanEventInput> {
  const result = validateEventInput(body);
  if ('error' in result) throw new HttpError(400, result.error);
  const { guests } = result.value;
  if (guests.length > 0) {
    const { results } = await db
      .prepare(`SELECT slug FROM guests WHERE slug IN (${placeholders(guests.length)})`)
      .bind(...guests)
      .all<{ slug: string }>();
    if (results.length !== guests.length) {
      throw new HttpError(400, 'One of the chosen guests isn’t on the guest list. Reload and try again.');
    }
  }
  return result.value;
}

async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base = slugForEventName(name);
  const { results } = await db
    .prepare("SELECT slug FROM events WHERE slug = ? OR slug LIKE ? || '\\_%' ESCAPE '\\'")
    .bind(base, base)
    .all<{ slug: string }>();
  const taken = new Set(results.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

function inviteStatements(db: D1Database, slug: string, guests: string[]): D1PreparedStatement[] {
  return [
    db.prepare('DELETE FROM guest_events WHERE event_slug = ?').bind(slug),
    ...guests.map((guest) =>
      db.prepare('INSERT INTO guest_events (guest_slug, event_slug) VALUES (?, ?)').bind(guest, slug),
    ),
  ];
}

const detailValues = (input: CleanEventInput) => [
  input.name,
  input.start.toISOString(),
  input.end ? input.end.toISOString() : null,
  input.location,
  input.description,
  input.attire || null,
  input.image || null,
  input.mapLink || null,
];

export async function createEvent(db: D1Database, body: EventInput): Promise<AdminEvent> {
  const input = await cleanInput(db, body);
  const slug = await uniqueSlug(db, input.name);
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO events
           (slug, name, start_time, end_time, location, description, attire, image, map_link,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(slug, ...detailValues(input), now, now),
    ...inviteStatements(db, slug, input.guests),
  ]);
  const [created] = await listAdminEvents(db, [slug]);
  return created;
}

/** Edits an event's details and who's invited. The slug never changes. */
export async function updateEvent(db: D1Database, slug: string, body: EventInput): Promise<AdminEvent> {
  const [existing] = await loadEvents(db, [slug]);
  if (!existing) throw new HttpError(404, 'That event no longer exists.');
  const input = await cleanInput(db, body);
  await db.batch([
    db
      .prepare(
        `UPDATE events SET
           name = ?, start_time = ?, end_time = ?, location = ?, description = ?, attire = ?,
           image = ?, map_link = ?, updated_at = ?
         WHERE slug = ?`,
      )
      .bind(...detailValues(input), new Date().toISOString(), slug),
    ...inviteStatements(db, slug, input.guests),
  ]);
  const [updated] = await listAdminEvents(db, [slug]);
  return updated;
}

/** Removes an event with every invitation to it and every RSVP answer for it. */
export async function deleteEvent(db: D1Database, slug: string): Promise<void> {
  const [existing] = await loadEvents(db, [slug]);
  if (!existing) throw new HttpError(404, 'That event no longer exists.');
  // The foreign keys cascade too; deleting explicitly doesn't depend on that.
  await db.batch([
    db.prepare('DELETE FROM event_rsvps WHERE event_slug = ?').bind(slug),
    db.prepare('DELETE FROM guest_events WHERE event_slug = ?').bind(slug),
    db.prepare('DELETE FROM events WHERE slug = ?').bind(slug),
  ]);
}
