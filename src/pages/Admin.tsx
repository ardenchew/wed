import { useMemo, useState } from 'react';
import { AdminEventDialog } from '../components/AdminEventDialog';
import { AdminGuestDialog } from '../components/AdminGuestDialog';
import { HomeHeader } from '../components/HomeHeader';
import { EVENT_TIME_ZONE } from '../config/events';
import { ADMIN_PATH } from '../config/nav';
import type { AdminEvent, EventInput } from '../events/shared';
import { displayName, type AdminGuest, type GuestInput } from '../guests/shared';
import { useAdminEvents } from '../hooks/useAdminEvents';
import { useAdminGuests } from '../hooks/useAdminGuests';
import { useEvents } from '../hooks/useEvents';
import { statusLabel } from '../rsvp/labels';
import { formatPhone, rsvpStatus, type RsvpStatus } from '../rsvp/shared';
import { matchesSearch } from '../utils/search';

type Editing =
  | { kind: 'guest'; mode: 'add' }
  | { kind: 'guest'; mode: 'edit'; slug: string }
  | { kind: 'event'; mode: 'add' }
  | { kind: 'event'; mode: 'edit'; slug: string }
  | null;

const eventWhenFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: EVENT_TIME_ZONE,
});

const eventEndFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: EVENT_TIME_ZONE,
});

function eventWhen(event: AdminEvent): string {
  const start = eventWhenFormatter.format(new Date(event.start_time));
  return event.end_time ? `${start} – ${eventEndFormatter.format(new Date(event.end_time))}` : start;
}

function eventAnswers(event: AdminEvent): { yes: number; no: number } {
  const answers = Object.values(event.responses);
  return { yes: answers.filter(Boolean).length, no: answers.filter((a) => !a).length };
}

function statusOf(guest: AdminGuest): RsvpStatus {
  return rsvpStatus({ events: guest.events, responses: guest.rsvp.responses });
}

/** Guests, events, RSVPs and add / edit / remove — for Emily and Arden only (see AdminRoute). */
export default function Admin() {
  const { guests, loading, error, reload, refresh: refreshGuests, create, update, remove } = useAdminGuests();
  const adminEvents = useAdminEvents();
  const { events, refresh: refreshEvents } = adminEvents;
  // The admin's own schedule, so it shows their edits without a page reload.
  const { reload: reloadMyEvents } = useEvents();
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState('');
  const visibleGuests = useMemo(
    () => (guests ?? []).filter((guest) => matchesSearch(guest, query)),
    [guests, query],
  );

  const summary = useMemo(() => {
    const counts = { yes: 0, partial: 0, no: 0, pending: 0 };
    for (const guest of guests ?? []) counts[statusOf(guest)] += 1;
    return counts;
  }, [guests]);

  const partyNames = (guest: AdminGuest) =>
    (guests ?? [])
      .filter((other) => guest.partyId && other.partyId === guest.partyId && other.slug !== guest.slug)
      .map(displayName)
      .join(', ');

  const editingGuest =
    editing?.kind === 'guest' && editing.mode === 'edit'
      ? (guests ?? []).find((guest) => guest.slug === editing.slug) ?? null
      : null;
  const editingEvent =
    editing?.kind === 'event' && editing.mode === 'edit'
      ? (events ?? []).find((event) => event.slug === editing.slug) ?? null
      : null;

  // A guest's invitations show on the events table and vice versa, so refresh the other list too.
  const afterGuestWrite = async <T,>(write: Promise<T>) => {
    const out = await write;
    await refreshEvents().catch(() => undefined);
    reloadMyEvents();
    return out;
  };
  const afterEventWrite = async <T,>(write: Promise<T>) => {
    const out = await write;
    await refreshGuests().catch(() => undefined);
    reloadMyEvents();
    return out;
  };
  const saveGuest = (input: GuestInput) =>
    afterGuestWrite(editingGuest ? update(editingGuest.slug, input) : create(input));
  const saveEvent = (input: EventInput) =>
    afterEventWrite(editingEvent ? adminEvents.update(editingEvent.slug, input) : adminEvents.create(input));

  return (
    <main className="home-page home-page--schedule paper-bg">
      <HomeHeader activePath={ADMIN_PATH} />
      <section className="admin">
        <h1 className="schedule__title">Guests</h1>

        {guests && (
          <p className="admin__summary">
            {guests.length} guests · {summary.yes + summary.partial} attending
            {summary.partial > 0 ? ` (${summary.partial} partly)` : ''} · {summary.no} not attending ·{' '}
            {summary.pending} no response
          </p>
        )}

        <div className="admin__toolbar">
          <div className="admin__search-wrap">
            <svg
              className="admin__search-icon"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="7" cy="7" r="4.75" />
              <path d="M10.5 10.5 14 14" />
            </svg>
            <input
              type="search"
              className="admin__search"
              placeholder="Search"
              aria-label="Search guests by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!guests}
            />
          </div>
          <button
            type="button"
            className="admin__add"
            aria-label="Add guest"
            title="Add guest"
            onClick={() => setEditing({ kind: 'guest', mode: 'add' })}
            disabled={!guests || !events}
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        </div>

        {!guests && loading && <p className="admin__message">Loading guests…</p>}
        {error && (
          <div className="admin__message" role="alert">
            <p>{error.message}</p>
            <button type="button" className="rsvp-button" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {guests && (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Party</th>
                <th scope="col">RSVP</th>
                <th scope="col">Mobile</th>
                <th scope="col">Dietary</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleGuests.map((guest) => (
                <tr key={guest.slug}>
                  <td data-label="Guest">
                    <span className="admin-table__name">{displayName(guest)}</span>
                    {guest.isAdmin && <span className="admin-table__tag">admin</span>}
                    <span className="admin-table__meta">
                      {guest.events.length === 0
                        ? 'No invitations'
                        : `${guest.events.length} event${guest.events.length === 1 ? '' : 's'}`}
                    </span>
                  </td>
                  <td data-label="Party">{partyNames(guest) || '—'}</td>
                  <td data-label="RSVP">
                    <span className={`rsvp-chip rsvp-chip--${statusOf(guest)}`}>
                      {statusLabel({ events: guest.events, responses: guest.rsvp.responses })}
                    </span>
                  </td>
                  <td data-label="Mobile">{guest.rsvp.phone ? formatPhone(guest.rsvp.phone) : '—'}</td>
                  <td data-label="Dietary">{guest.rsvp.dietary || '—'}</td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="admin-link"
                      onClick={() => setEditing({ kind: 'guest', mode: 'edit', slug: guest.slug })}
                      disabled={!events}
                      aria-label={`Edit ${displayName(guest)}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {guests && guests.length > 0 && visibleGuests.length === 0 && (
          <p className="admin__message">
            No guests match “{query.trim()}”.{' '}
            <button type="button" className="admin-link" onClick={() => setQuery('')}>
              Clear search
            </button>
          </p>
        )}

        <h2 className="schedule__title admin__section-title">Events</h2>
        {events && (
          <p className="admin__summary">
            {events.length} event{events.length === 1 ? '' : 's'} · times in California time
          </p>
        )}
        <div className="admin__toolbar">
          <button
            type="button"
            className="admin__add"
            aria-label="Add event"
            title="Add event"
            onClick={() => setEditing({ kind: 'event', mode: 'add' })}
            disabled={!events || !guests}
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        </div>

        {!events && adminEvents.loading && <p className="admin__message">Loading events…</p>}
        {adminEvents.error && (
          <div className="admin__message" role="alert">
            <p>{adminEvents.error.message}</p>
            <button type="button" className="rsvp-button" onClick={adminEvents.reload}>
              Try again
            </button>
          </div>
        )}

        {events && events.length === 0 && <p className="admin__message">No events yet.</p>}
        {events && events.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Location</th>
                <th scope="col">Invited</th>
                <th scope="col">RSVPs</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const { yes, no } = eventAnswers(event);
                return (
                  <tr key={event.slug}>
                    <td data-label="Event">
                      <span className="admin-table__name">{event.name}</span>
                      <span className="admin-table__meta">{eventWhen(event)}</span>
                    </td>
                    <td data-label="Location">{event.location}</td>
                    <td data-label="Invited">{event.invited.length}</td>
                    <td data-label="RSVPs">
                      {yes} attending · {no} not · {event.invited.length - yes - no} no answer
                    </td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() => setEditing({ kind: 'event', mode: 'edit', slug: event.slug })}
                        disabled={!guests}
                        aria-label={`Edit ${event.name}`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {guests && events && editing?.kind === 'guest' && (editing.mode === 'add' || editingGuest) && (
        <AdminGuestDialog
          key={editing.mode === 'edit' ? editing.slug : 'new'}
          guest={editingGuest}
          guests={guests}
          events={events}
          onSave={saveGuest}
          onDelete={() => (editingGuest ? afterGuestWrite(remove(editingGuest.slug)) : Promise.resolve())}
          onClose={() => setEditing(null)}
        />
      )}

      {guests && events && editing?.kind === 'event' && (editing.mode === 'add' || editingEvent) && (
        <AdminEventDialog
          key={editing.mode === 'edit' ? editing.slug : 'new-event'}
          event={editingEvent}
          guests={guests}
          onSave={saveEvent}
          onDelete={() =>
            editingEvent ? afterEventWrite(adminEvents.remove(editingEvent.slug)) : Promise.resolve()
          }
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
