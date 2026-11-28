import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ApiError } from '../api/client';
import { EVENT_TIME_ZONE } from '../config/events';
import type { AdminEvent } from '../events/shared';
import {
  displayName,
  GUEST_LIMITS,
  WELCOME_DEFAULTS,
  validateGuestInput,
  type AdminGuest,
  type GuestInput,
} from '../guests/shared';
import { statusLabel } from '../rsvp/labels';
import { formatPhone, rsvpStatus } from '../rsvp/shared';

interface AdminGuestDialogProps {
  /** The guest being edited, or null to add a new one. */
  guest: AdminGuest | null;
  /** Everyone, for the party picker. */
  guests: AdminGuest[];
  /** Every event in schedule order, for the invitations. */
  events: AdminEvent[];
  onSave: (input: GuestInput) => Promise<unknown>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

const whenFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: EVENT_TIME_ZONE,
});

const updatedFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Everyone except this guest, by first name, for the party checklist. */
function partyCandidates(guests: AdminGuest[], self: AdminGuest | null): AdminGuest[] {
  return guests
    .filter((guest) => guest.slug !== self?.slug)
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));
}

function initialInput(guest: AdminGuest | null, guests: AdminGuest[]): GuestInput {
  return {
    first: guest?.first ?? '',
    last: guest?.last ?? '',
    nickname: guest?.nickname ?? '',
    password: guest?.password ?? '',
    welcomeGreetingText: guest?.welcomeGreetingText ?? '',
    welcomeBodyText: guest?.welcomeBodyText ?? '',
    welcomeSignatureText: guest?.welcomeSignatureText ?? '',
    polaroids: guest?.polaroids.length ? guest.polaroids : [],
    events: guest?.events ?? [],
    partyMembers: guest?.partyId
      ? guests
          .filter((other) => other.partyId === guest.partyId && other.slug !== guest.slug)
          .map((other) => other.slug)
      : [],
  };
}

export function AdminGuestDialog({ guest, guests, events, onSave, onDelete, onClose }: AdminGuestDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [input, setInput] = useState<GuestInput>(() => initialInput(guest, guests));
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const candidates = useMemo(() => partyCandidates(guests, guest), [guests, guest]);
  const eventsBySlug = useMemo(() => new Map(events.map((event) => [event.slug, event])), [events]);
  const name = guest ? displayName(guest) : 'New guest';

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

  const set = <K extends keyof GuestInput>(key: K, value: GuestInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const toggleEvent = (slug: string, checked: boolean) =>
    set('events', checked ? [...input.events, slug] : input.events.filter((event) => event !== slug));

  const setPolaroid = (index: number, field: 'publicId' | 'dateText', value: string) =>
    set(
      'polaroids',
      input.polaroids.map((polaroid, i) => (i === index ? { ...polaroid, [field]: value } : polaroid)),
    );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const checked = validateGuestInput(input, new Set(eventsBySlug.keys()));
    if ('error' in checked) {
      setError(checked.error);
      return;
    }
    setBusy('save');
    try {
      await onSave(checked.value);
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.');
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!guest) return;
    const confirmed = window.confirm(
      `Remove ${displayName(guest)}? This also deletes their RSVP and can’t be undone.`,
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

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close();
  };

  const rsvp = guest?.rsvp;
  const answered = rsvp && Object.keys(rsvp.responses).length > 0;

  return (
    <dialog
      ref={dialogRef}
      className="rsvp-modal admin-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={handleDialogClick}
    >
      <div className="rsvp-modal__panel">
        <header className="rsvp-modal__header">
          <h2 className="rsvp-modal__title" id={`${id}-title`}>
            {name}
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
              <h3 className="admin-form__heading">Guest</h3>
              <div className="admin-form__row">
                <label className="admin-field">
                  <span>First name *</span>
                  <input
                    value={input.first}
                    maxLength={GUEST_LIMITS.name}
                    onChange={(e) => set('first', e.target.value)}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Last name *</span>
                  <input
                    value={input.last}
                    maxLength={GUEST_LIMITS.name}
                    onChange={(e) => set('last', e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="admin-form__row">
                <label className="admin-field">
                  <span>Nickname</span>
                  <input
                    value={input.nickname}
                    maxLength={GUEST_LIMITS.nickname}
                    onChange={(e) => set('nickname', e.target.value)}
                  />
                </label>
                <label className="admin-field">
                  <span>Password *</span>
                  <input
                    value={input.password}
                    maxLength={GUEST_LIMITS.password}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => set('password', e.target.value)}
                    required
                  />
                </label>
              </div>
              <fieldset className="admin-party">
                <legend>Party</legend>
                <p className="admin-form__note">
                  {input.partyMembers.length === 0
                    ? 'On their own. Tick anyone who should be in their party — party members can RSVP for each other.'
                    : `With ${input.partyMembers.length} other${input.partyMembers.length === 1 ? '' : 's'} — party members can RSVP for each other.`}
                </p>
                <div className="admin-party__list">
                  {candidates.map((candidate) => {
                    const ticked = input.partyMembers.includes(candidate.slug);
                    // Someone in a different party moves over when ticked.
                    const elsewhere =
                      candidate.partyId && (!guest || candidate.partyId !== guest.partyId)
                        ? guests
                            .filter((g) => g.partyId === candidate.partyId && g.slug !== candidate.slug)
                            .map(displayName)
                        : [];
                    return (
                      <label key={candidate.slug} className="admin-check">
                        <input
                          type="checkbox"
                          checked={ticked}
                          onChange={(e) =>
                            set(
                              'partyMembers',
                              e.target.checked
                                ? [...input.partyMembers, candidate.slug]
                                : input.partyMembers.filter((slug) => slug !== candidate.slug),
                            )
                          }
                        />
                        <span>
                          {displayName(candidate)}
                          {elsewhere.length > 0 && (
                            <span className="admin-check__meta">
                              {ticked ? ' · moves from ' : ' · with '}
                              {elsewhere.join(', ')}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {guest?.isAdmin && <p className="admin-form__note">Admin — can open this page.</p>}
            </section>

            <section className="admin-form__section">
              <h3 className="admin-form__heading">Invited to</h3>
              <div className="admin-events">
                {events.length === 0 && <p className="admin-form__note">No events yet — add them under Events.</p>}
                {events.map((event) => (
                  <label key={event.slug} className="admin-check">
                    <input
                      type="checkbox"
                      checked={input.events.includes(event.slug)}
                      onChange={(e) => toggleEvent(event.slug, e.target.checked)}
                    />
                    <span>
                      {event.name}
                      <span className="admin-check__meta"> · {whenFormatter.format(new Date(event.start_time))}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="admin-form__section">
              <h3 className="admin-form__heading">Welcome message</h3>
              <label className="admin-field">
                <span>Greeting</span>
                <input
                  value={input.welcomeGreetingText}
                  maxLength={GUEST_LIMITS.welcomeGreeting}
                  placeholder={WELCOME_DEFAULTS.greeting}
                  onChange={(e) => set('welcomeGreetingText', e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Message</span>
                <textarea
                  rows={4}
                  value={input.welcomeBodyText}
                  maxLength={GUEST_LIMITS.welcomeBody}
                  placeholder={WELCOME_DEFAULTS.body}
                  onChange={(e) => set('welcomeBodyText', e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Signature</span>
                <input
                  value={input.welcomeSignatureText}
                  maxLength={GUEST_LIMITS.welcomeSignature}
                  placeholder={WELCOME_DEFAULTS.signature}
                  onChange={(e) => set('welcomeSignatureText', e.target.value)}
                />
              </label>
              <p className="admin-form__note">Left blank, the Home page uses the default text shown in grey.</p>
            </section>

            <section className="admin-form__section">
              <h3 className="admin-form__heading">Polaroids</h3>
              <p className="admin-form__note">
                Cloudinary image ids, e.g. <code>wed/guests/debbie_kwan/1</code>. The first is the
                Home page polaroid; the rest join the gallery.
              </p>
              {input.polaroids.map((polaroid, index) => (
                <div key={index} className="admin-polaroid">
                  <input
                    aria-label={`Polaroid ${index + 1} image id`}
                    placeholder="wed/guests/…"
                    value={polaroid.publicId}
                    maxLength={GUEST_LIMITS.publicId}
                    spellCheck={false}
                    onChange={(e) => setPolaroid(index, 'publicId', e.target.value)}
                  />
                  <input
                    aria-label={`Polaroid ${index + 1} date`}
                    placeholder="Date, e.g. 1 29 2022"
                    value={polaroid.dateText}
                    maxLength={GUEST_LIMITS.dateText}
                    onChange={(e) => setPolaroid(index, 'dateText', e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() =>
                      set(
                        'polaroids',
                        input.polaroids.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              {input.polaroids.length < GUEST_LIMITS.polaroids && (
                <button
                  type="button"
                  className="admin-link"
                  onClick={() => set('polaroids', [...input.polaroids, { publicId: '', dateText: '' }])}
                >
                  + Add polaroid
                </button>
              )}
            </section>

            {guest && rsvp && (
              <section className="admin-form__section">
                <h3 className="admin-form__heading">
                  RSVP{' '}
                  <span className={`rsvp-chip rsvp-chip--${rsvpStatus({ events: guest.events, responses: rsvp.responses })}`}>
                    {statusLabel({ events: guest.events, responses: rsvp.responses })}
                  </span>
                </h3>
                {answered ? (
                  <>
                    <ul className="admin-rsvp">
                      {guest.events.map((slug) => (
                        <li key={slug}>
                          <span>{eventsBySlug.get(slug)?.name ?? slug}</span>
                          <span className={`admin-rsvp__answer admin-rsvp__answer--${String(rsvp.responses[slug])}`}>
                            {rsvp.responses[slug] === true
                              ? 'Attending'
                              : rsvp.responses[slug] === false
                                ? 'Not attending'
                                : 'No answer'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <dl className="admin-rsvp__details">
                      <dt>Mobile</dt>
                      <dd>{rsvp.phone ? formatPhone(rsvp.phone) : '—'}</dd>
                      <dt>Dietary</dt>
                      <dd>{rsvp.dietary || '—'}</dd>
                      {rsvp.updatedAt && (
                        <>
                          <dt>Updated</dt>
                          <dd>
                            {updatedFormatter.format(new Date(rsvp.updatedAt))}
                            {rsvp.updatedBy && rsvp.updatedBy !== guest.slug
                              ? ` by ${displayName(guests.find((g) => g.slug === rsvp.updatedBy) ?? { first: rsvp.updatedBy, last: '' })}`
                              : ''}
                          </dd>
                        </>
                      )}
                    </dl>
                  </>
                ) : (
                  <p className="admin-form__note">No response yet.</p>
                )}
              </section>
            )}

            {error && (
              <p className="rsvp-modal__error" role="alert">
                {error}
              </p>
            )}

            <div className="rsvp-modal__footer admin-dialog__footer">
              {guest && !guest.isAdmin && (
                <button
                  type="button"
                  className="rsvp-button admin-dialog__delete"
                  onClick={handleDelete}
                  disabled={Boolean(busy)}
                >
                  {busy === 'delete' ? 'Removing…' : 'Remove guest'}
                </button>
              )}
              <button type="button" className="rsvp-button" onClick={close} disabled={Boolean(busy)}>
                Cancel
              </button>
              <button type="submit" className="rsvp-button rsvp-button--primary" disabled={Boolean(busy)}>
                {busy === 'save' ? 'Saving…' : guest ? 'Save' : 'Add guest'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
