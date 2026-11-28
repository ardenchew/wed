import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ApiError } from '../api/client';
import { EVENT_TIME_ZONE } from '../config/events';
import {
  CLOUDINARY_ID,
  EVENT_LIMITS,
  eventToInput,
  validateEventInput,
  type AdminEvent,
  type EventInput,
} from '../events/shared';
import { displayName, type AdminGuest } from '../guests/shared';
import { cloudinaryUrl, isCloudinaryId } from '../utils/cloudinary';
import { matchesSearch } from '../utils/search';

interface AdminEventDialogProps {
  /** The event being edited, or null to add a new one. */
  event: AdminEvent | null;
  /** Everyone, for the invitation checklist. */
  guests: AdminGuest[];
  onSave: (input: EventInput) => Promise<unknown>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

/** "Fri, May 14, 5:00 PM PDT": the resolved time with its zone, so the DST offset is visible. */
const resolvedFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: EVENT_TIME_ZONE,
});

const endFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: EVENT_TIME_ZONE,
});

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Image preview that says so when the id doesn't load, instead of showing a broken image. */
function ImagePreview({ publicId }: { publicId: string }) {
  const [failed, setFailed] = useState(false);
  if (!publicId || !CLOUDINARY_ID.test(publicId) || !isCloudinaryId(publicId)) {
    return <p className="admin-form__note">Ids start with <code>wed/</code>, e.g. <code>wed/schedule/brix</code>.</p>;
  }
  if (failed) return <p className="admin-form__note">Couldn’t load that image — check the id.</p>;
  return (
    <img
      className="admin-image-preview"
      src={cloudinaryUrl(publicId, { w: 320, c: 'limit' })}
      alt="Preview"
      onError={() => setFailed(true)}
    />
  );
}

export function AdminEventDialog({ event, guests, onSave, onDelete, onClose }: AdminEventDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [input, setInput] = useState<EventInput>(() => eventToInput(event));
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestQuery, setGuestQuery] = useState('');
  const sortedGuests = useMemo(
    () => [...guests].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [guests],
  );
  const visibleGuests = sortedGuests.filter((guest) => matchesSearch(guest, guestQuery));
  const checked = validateEventInput(input);
  const resolved = 'value' in checked ? checked.value : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, []);

  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const setInvited = (slugs: string[], invited: boolean) => {
    const next = new Set(input.guests);
    for (const slug of slugs) {
      if (invited) next.add(slug);
      else next.delete(slug);
    }
    set('guests', [...next]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ('error' in checked) {
      setError(checked.error);
      return;
    }
    setBusy('save');
    try {
      await onSave(input);
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    const answers = Object.keys(event.responses).length;
    const confirmed = window.confirm(
      `Delete ${event.name}? This also removes ${plural(event.invited.length, 'invitation')} and ` +
        `${plural(answers, 'RSVP answer')} for it, and can’t be undone.`,
    );
    if (!confirmed) return;
    setBusy('delete');
    try {
      await onDelete();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  };

  const close = () => {
    if (!busy) onClose();
  };

  const handleDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) close();
  };

  const answerLabel = (slug: string) => {
    if (!event || !input.guests.includes(slug)) return null;
    const answer = event.responses[slug];
    if (answer === undefined) return null;
    return answer ? ' · attending' : ' · not attending';
  };

  return (
    <dialog
      ref={dialogRef}
      className="rsvp-modal admin-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={handleDialogClick}
    >
      <div className="rsvp-modal__panel">
        <header className="rsvp-modal__header">
          <h2 className="rsvp-modal__title" id={`${id}-title`}>
            {event ? event.name : 'New event'}
          </h2>
          <button
            type="button"
            className="rsvp-modal__close"
            aria-label="Close"
            onClick={close}
            disabled={Boolean(busy)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="rsvp-modal__body">
          <form onSubmit={handleSubmit} noValidate>
            <section className="admin-form__section">
              <h3 className="admin-form__heading">Event</h3>
              <div className="admin-form__row">
                <label className="admin-field">
                  <span>Name *</span>
                  <input
                    value={input.name}
                    maxLength={EVENT_LIMITS.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Location *</span>
                  <input
                    value={input.location}
                    maxLength={EVENT_LIMITS.location}
                    onChange={(e) => set('location', e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="admin-form__row admin-form__row--three">
                <label className="admin-field">
                  <span>Date *</span>
                  <input type="date" value={input.date} onChange={(e) => set('date', e.target.value)} required />
                </label>
                <label className="admin-field">
                  <span>Starts *</span>
                  <input
                    type="time"
                    value={input.startTime}
                    onChange={(e) => set('startTime', e.target.value)}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Ends</span>
                  <input type="time" value={input.endTime} onChange={(e) => set('endTime', e.target.value)} />
                </label>
              </div>
              <p className="admin-form__note">
                {resolved
                  ? `${resolvedFormatter.format(resolved.start)}${
                      resolved.end
                        ? ` – ${endFormatter.format(resolved.end)}${
                            input.endTime < input.startTime ? ' the next day' : ''
                          }`
                        : ''
                    }`
                  : 'Times are California time, wherever you’re editing from.'}
              </p>
              <div className="admin-form__row">
                <label className="admin-field">
                  <span>Attire</span>
                  <input
                    value={input.attire}
                    maxLength={EVENT_LIMITS.attire}
                    onChange={(e) => set('attire', e.target.value)}
                  />
                </label>
                <label className="admin-field">
                  <span>Map link</span>
                  <input
                    type="url"
                    value={input.mapLink}
                    maxLength={EVENT_LIMITS.mapLink}
                    placeholder="https://maps.app.goo.gl/…"
                    spellCheck={false}
                    onChange={(e) => set('mapLink', e.target.value)}
                  />
                </label>
              </div>
              <label className="admin-field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={input.description}
                  maxLength={EVENT_LIMITS.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </label>
            </section>

            <section className="admin-form__section">
              <h3 className="admin-form__heading">Image</h3>
              <div className="admin-image">
                <label className="admin-field">
                  <span>Cloudinary image id</span>
                  <input
                    value={input.image}
                    maxLength={EVENT_LIMITS.image}
                    placeholder="wed/schedule/…"
                    spellCheck={false}
                    onChange={(e) => set('image', e.target.value)}
                  />
                </label>
                <ImagePreview key={input.image.trim()} publicId={input.image.trim()} />
              </div>
            </section>

            <section className="admin-form__section">
              <fieldset className="admin-party">
                <legend className="admin-form__heading">Invited</legend>
                <p className="admin-form__note">
                  {input.guests.length === 0
                    ? 'Nobody yet — only invited guests see this event.'
                    : `${plural(input.guests.length, 'guest')} invited. Only they see this event.`}
                </p>
                <div className="admin-invite__tools">
                  <input
                    type="search"
                    className="admin__search admin-invite__search"
                    placeholder="Filter guests"
                    aria-label="Filter guests by name"
                    value={guestQuery}
                    onChange={(e) => setGuestQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => setInvited(visibleGuests.map((guest) => guest.slug), true)}
                  >
                    {guestQuery.trim() ? 'Invite shown' : 'Invite all'}
                  </button>
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => setInvited(visibleGuests.map((guest) => guest.slug), false)}
                  >
                    {guestQuery.trim() ? 'Clear shown' : 'Clear all'}
                  </button>
                </div>
                <div className="admin-party__list">
                  {visibleGuests.map((guest) => (
                    <label key={guest.slug} className="admin-check">
                      <input
                        type="checkbox"
                        checked={input.guests.includes(guest.slug)}
                        onChange={(e) => setInvited([guest.slug], e.target.checked)}
                      />
                      <span>
                        {displayName(guest)}
                        <span className="admin-check__meta">{answerLabel(guest.slug)}</span>
                      </span>
                    </label>
                  ))}
                  {visibleGuests.length === 0 && <p className="admin-form__note">No guests match.</p>}
                </div>
                {event && (
                  <p className="admin-form__note">
                    Unticking someone who has answered hides their answer; ticking them again brings it back.
                  </p>
                )}
              </fieldset>
            </section>

            {error && (
              <p className="rsvp-modal__error" role="alert">
                {error}
              </p>
            )}

            <div className="rsvp-modal__footer admin-dialog__footer">
              {event && (
                <button
                  type="button"
                  className="rsvp-button admin-dialog__delete"
                  onClick={handleDelete}
                  disabled={Boolean(busy)}
                >
                  {busy === 'delete' ? 'Deleting…' : 'Delete event'}
                </button>
              )}
              <button type="button" className="rsvp-button" onClick={close} disabled={Boolean(busy)}>
                Cancel
              </button>
              <button type="submit" className="rsvp-button rsvp-button--primary" disabled={Boolean(busy)}>
                {busy === 'save' ? 'Saving…' : event ? 'Save' : 'Add event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
