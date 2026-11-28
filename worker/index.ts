/**
 * RSVP API — a Cloudflare Worker backed by the `wed` D1 database.
 *
 *   GET /rsvp   → the signed-in guest's party, with each member's invitations and answers
 *   PUT /rsvp   → save answers (plus phone and dietary restrictions) for members of that party
 *
 * Guests sign in with HTTP Basic auth (`slug:password`), checked against the same
 * `src/config/authUsers.ts` the site uses. Guests, parties and invitations come from
 * `src/config/*`; D1 only stores what guests tell us.
 */
import { USER_PASSWORDS } from '../src/config/authUsers';
import { GUESTS } from '../src/config/guests';
import { EVENTS } from '../src/config/events';
import {
  DIETARY_MAX_LENGTH,
  normalizePhone,
  partyOf,
  sortEventSlugs,
  type PartyMemberRsvp,
  type PartyRsvpResponse,
  type RsvpErrorBody,
  type RsvpUpdateRequest,
} from '../src/rsvp/shared';

interface Env {
  DB: D1Database;
  /** The production site's origin; any http://localhost origin is also allowed for development. */
  SITE_ORIGIN: string;
}

interface GuestRow {
  guest_slug: string;
  phone: string | null;
  dietary: string | null;
  updated_at: string;
  updated_by: string;
}

interface EventRow {
  guest_slug: string;
  event_slug: string;
  attending: number;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly guest?: string,
  ) {
    super(message);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const { pathname } = new URL(request.url);
      if (pathname !== '/rsvp') throw new HttpError(404, 'Not found');

      const self = authenticate(request);
      if (request.method === 'GET') return json(await loadParty(env.DB, self), 200, cors);
      if (request.method === 'PUT') {
        await saveParty(env.DB, self, await readBody(request));
        return json(await loadParty(env.DB, self), 200, cors);
      }
      throw new HttpError(405, 'Method not allowed');
    } catch (error) {
      if (error instanceof HttpError) {
        const body: RsvpErrorBody = { error: error.message, guest: error.guest };
        return json(body, error.status, cors);
      }
      console.error(error);
      return json({ error: 'Something went wrong saving your RSVP.' }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });
  const origin = request.headers.get('Origin');
  if (origin && (origin === env.SITE_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return headers;
}

function json(body: unknown, status: number, headers: Headers): Response {
  const out = new Headers(headers);
  out.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers: out });
}

/** Returns the guest slug from `Authorization: Basic base64(slug:password)`. */
function authenticate(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Basic\s+(.+)$/i.exec(header);
  if (!match) throw new HttpError(401, 'Please sign in again.');

  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)));
  } catch {
    throw new HttpError(401, 'Please sign in again.');
  }
  const separator = decoded.indexOf(':');
  const slug = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const expected = Object.hasOwn(USER_PASSWORDS, slug) ? USER_PASSWORDS[slug] : undefined;
  if (separator < 1 || expected === undefined || expected !== password || !GUESTS[slug]) {
    throw new HttpError(401, 'Please sign in again.');
  }
  return slug;
}

async function readBody(request: Request): Promise<RsvpUpdateRequest> {
  try {
    return (await request.json()) as RsvpUpdateRequest;
  } catch {
    throw new HttpError(400, 'Invalid request.');
  }
}

async function loadParty(db: D1Database, self: string): Promise<PartyRsvpResponse> {
  const members = partyOf(self);
  const placeholders = members.map(() => '?').join(', ');
  const [guestRows, eventRows] = await db.batch<GuestRow | EventRow>([
    db.prepare(`SELECT * FROM guest_rsvps WHERE guest_slug IN (${placeholders})`).bind(...members),
    db
      .prepare(`SELECT guest_slug, event_slug, attending FROM event_rsvps WHERE guest_slug IN (${placeholders})`)
      .bind(...members),
  ]);

  const guestsBySlug = new Map((guestRows.results as GuestRow[]).map((row) => [row.guest_slug, row]));
  const party = members.map((slug): PartyMemberRsvp => {
    const guest = GUESTS[slug];
    const events = sortEventSlugs(guest.events);
    const responses: Record<string, boolean> = {};
    for (const row of eventRows.results as EventRow[]) {
      // Ignore answers for events the guest is no longer invited to.
      if (row.guest_slug === slug && events.includes(row.event_slug)) {
        responses[row.event_slug] = row.attending === 1;
      }
    }
    const stored = guestsBySlug.get(slug);
    return {
      slug,
      first: guest.first,
      last: guest.last,
      events,
      phone: stored?.phone ?? null,
      dietary: stored?.dietary ?? null,
      responses,
      updatedAt: stored?.updated_at ?? null,
      updatedBy: stored?.updated_by ?? null,
    };
  });

  return { self, party };
}

async function saveParty(db: D1Database, self: string, body: RsvpUpdateRequest): Promise<void> {
  if (!body || !Array.isArray(body.guests) || body.guests.length === 0) {
    throw new HttpError(400, 'Choose at least one guest to RSVP for.');
  }

  const current = new Map((await loadParty(db, self)).party.map((member) => [member.slug, member]));
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  const seen = new Set<string>();

  for (const update of body.guests) {
    const member = current.get(update?.slug);
    if (!member) throw new HttpError(403, 'You can only RSVP for guests in your party.');
    if (seen.has(member.slug)) throw new HttpError(400, 'Each guest can only appear once.', member.slug);
    seen.add(member.slug);

    const name = `${member.first} ${member.last}`;
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
        .bind(member.slug, phone, dietary, now, self),
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
          .bind(member.slug, event, attending ? 1 : 0, now, self),
      );
    }
  }

  // D1 runs a batch as a single transaction: either every answer is saved or none are.
  await db.batch(statements);
}
