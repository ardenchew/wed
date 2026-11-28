import { useMemo, useState } from 'react';
import { AdminGuestDialog } from '../components/AdminGuestDialog';
import { HomeHeader } from '../components/HomeHeader';
import { ADMIN_PATH } from '../config/nav';
import { displayName, type AdminGuest } from '../guests/shared';
import { useAdminGuests } from '../hooks/useAdminGuests';
import { statusLabel } from '../rsvp/labels';
import { formatPhone, rsvpStatus, type RsvpStatus } from '../rsvp/shared';

type Editing = { mode: 'add' } | { mode: 'edit'; slug: string } | null;

function statusOf(guest: AdminGuest): RsvpStatus {
  return rsvpStatus({ events: guest.events, responses: guest.rsvp.responses });
}

/** Guest list, RSVPs and add / edit / remove — for Emily and Arden only (see AdminRoute). */
export default function Admin() {
  const { guests, loading, error, reload, create, update, remove } = useAdminGuests();
  const [editing, setEditing] = useState<Editing>(null);

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
    editing?.mode === 'edit' ? (guests ?? []).find((guest) => guest.slug === editing.slug) ?? null : null;

  return (
    <main className="home-page home-page--schedule">
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
          <button
            type="button"
            className="rsvp-button rsvp-button--primary"
            onClick={() => setEditing({ mode: 'add' })}
            disabled={!guests}
          >
            Add guest
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
              {guests.map((guest) => (
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
                      onClick={() => setEditing({ mode: 'edit', slug: guest.slug })}
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
      </section>

      {guests && editing && (editing.mode === 'add' || editingGuest) && (
        <AdminGuestDialog
          key={editing.mode === 'edit' ? editing.slug : 'new'}
          guest={editingGuest}
          guests={guests}
          onSave={(input) => (editingGuest ? update(editingGuest.slug, input) : create(input))}
          onDelete={() => (editingGuest ? remove(editingGuest.slug) : Promise.resolve())}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
