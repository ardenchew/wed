/**
 * The site's API — a Cloudflare Worker backed by the `wed` D1 database.
 *
 *   POST   /guests/lookup       → the guests a typed name could mean, for sign-in (public)
 *   GET    /guests/names        → everyone's display name (public; deprecated, remove once the
 *                                  site using /guests/lookup is live)
 *   GET    /me                  → the signed-in guest's profile (also how sign-in checks a password)
 *   GET    /events              → details of the events the guest is invited to (no others)
 *   GET    /rsvp                → the guest's party, each member's invitations and answers, and
 *                                  the details of those events
 *   PUT    /rsvp                → save answers (plus phone and dietary restrictions) for that party
 *   GET    /admin/guests        → every guest, with password, party and RSVP   (admins only)
 *   POST   /admin/guests        → add a guest                                   (admins only)
 *   PUT    /admin/guests/:slug  → edit a guest                                  (admins only)
 *   DELETE /admin/guests/:slug  → remove a guest and their RSVP                 (admins only)
 *   GET    /admin/events        → every event, with who's invited and their answers (admins only)
 *   POST   /admin/events        → add an event                                  (admins only)
 *   PUT    /admin/events/:slug  → edit an event and who's invited               (admins only)
 *   DELETE /admin/events/:slug  → remove an event, its invitations and RSVPs    (admins only)
 *
 * Guests authenticate with HTTP Basic auth (`slug:password`) against the `guests` table. Events
 * live in the `events` table; a guest only ever sees the ones they (or, in /rsvp, their party)
 * are invited to.
 */
import type { EventInput } from '../src/events/shared';
import type { GuestInput } from '../src/guests/shared';
import type { RsvpUpdateRequest } from '../src/rsvp/shared';
import { createGuest, deleteGuest, listAdminGuests, requireAdmin, updateGuest } from './admin';
import { createEvent, deleteEvent, listAdminEvents, loadEvents, updateEvent } from './events';
import { authenticate, loadGuestNames, lookupGuests, toProfile } from './guests';
import { corsHeaders, errorResponse, HttpError, json, readJson, type Env } from './http';
import { loadParty, saveParty } from './rsvp';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const { pathname } = new URL(request.url);
      const { method } = request;
      const db = env.DB;
      const ok = (body: unknown, status = 200) => json(body, status, cors);

      if (pathname === '/guests/lookup' && method === 'POST') return ok(await lookupGuests(db, await readJson(request)));
      if (pathname === '/guests/names' && method === 'GET') return ok(await loadGuestNames(db));

      const self = await authenticate(request, db);

      if (pathname === '/me' && method === 'GET') return ok(toProfile(self));
      if (pathname === '/events' && method === 'GET') return ok(await loadEvents(db, self.events));

      if (pathname === '/rsvp') {
        if (method === 'GET') return ok(await loadParty(db, self));
        if (method === 'PUT') {
          await saveParty(db, self, await readJson<RsvpUpdateRequest>(request));
          return ok(await loadParty(db, self));
        }
      }

      if (pathname === '/admin/guests') {
        requireAdmin(self);
        if (method === 'GET') return ok(await listAdminGuests(db));
        if (method === 'POST') return ok(await createGuest(db, await readJson<GuestInput>(request)), 201);
      }

      const adminGuest = /^\/admin\/guests\/([a-z0-9_]+)$/.exec(pathname);
      if (adminGuest) {
        requireAdmin(self);
        const slug = adminGuest[1];
        if (method === 'PUT') return ok(await updateGuest(db, slug, await readJson<GuestInput>(request)));
        if (method === 'DELETE') {
          if (slug === self.row.slug) throw new HttpError(400, 'You can’t remove yourself.');
          await deleteGuest(db, slug);
          return ok({ deleted: slug });
        }
      }

      if (pathname === '/admin/events') {
        requireAdmin(self);
        if (method === 'GET') return ok(await listAdminEvents(db));
        if (method === 'POST') return ok(await createEvent(db, await readJson<EventInput>(request)), 201);
      }

      const adminEvent = /^\/admin\/events\/([a-z0-9_]+)$/.exec(pathname);
      if (adminEvent) {
        requireAdmin(self);
        const slug = adminEvent[1];
        if (method === 'PUT') return ok(await updateEvent(db, slug, await readJson<EventInput>(request)));
        if (method === 'DELETE') {
          await deleteEvent(db, slug);
          return ok({ deleted: slug });
        }
      }

      throw new HttpError(404, 'Not found');
    } catch (error) {
      return errorResponse(error, cors);
    }
  },
} satisfies ExportedHandler<Env>;
