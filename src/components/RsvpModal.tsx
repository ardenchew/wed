import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { EVENT_TIME_ZONE, EVENTS } from '../config/events';
import { RsvpApiError } from '../rsvp/api';
import { statusLabel } from '../rsvp/labels';
import {
  DIETARY_MAX_LENGTH,
  formatPhone,
  normalizePhone,
  rsvpStatus,
  type GuestRsvpUpdate,
  type PartyMemberRsvp,
  type PartyRsvpResponse,
  type RsvpStatus,
  type RsvpUpdateRequest,
} from '../rsvp/shared';

type Step = 'who' | 'respond' | 'done';
type Mode = 'all' | 'perEvent';

interface Draft {
  /** Event slug → answer; `undefined` = not answered. */
  responses: Record<string, boolean | undefined>;
  phone: string;
  /** Whether the "Dietary restrictions" option is ticked (it reveals the text field). */
  hasDietary: boolean;
  dietary: string;
}

interface RsvpModalProps {
  data: PartyRsvpResponse | null;
  loading: boolean;
  loadError: RsvpApiError | null;
  onRetry: () => void;
  onSave: (update: RsvpUpdateRequest) => Promise<PartyRsvpResponse>;
  onSignInAgain: () => void;
  onClose: () => void;
}

const eventWhenFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: EVENT_TIME_ZONE,
});

function formatEventWhen(slug: string): string {
  const parts = eventWhenFormatter.formatToParts(EVENTS[slug].start_time);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const minute = get('minute');
  const time = `${get('hour')}${minute === '00' ? '' : `:${minute}`}${get('dayPeriod').toLowerCase()}`;
  return `${get('weekday')}, ${get('month')} ${get('day')} · ${time}`;
}

function StatusChip({ member }: { member: Pick<PartyMemberRsvp, 'events' | 'responses'> }) {
  const status: RsvpStatus = rsvpStatus(member);
  return <span className={`rsvp-chip rsvp-chip--${status}`}>{statusLabel(member)}</span>;
}

function isMixed(member: PartyMemberRsvp): boolean {
  const answers = new Set(member.events.map((slug) => member.responses[slug]));
  return answers.size > 1;
}

/** In "all events" mode: true / false when every event has that answer, otherwise undefined. */
function allChoice(draft: Draft, events: string[]): boolean | undefined {
  const first = draft.responses[events[0]];
  return events.every((slug) => draft.responses[slug] === first) ? first : undefined;
}

function attendsAny(member: PartyMemberRsvp, draft: Draft): boolean {
  return member.events.some((slug) => draft.responses[slug] === true);
}

function initialDrafts(party: PartyMemberRsvp[]): Record<string, Draft> {
  return Object.fromEntries(
    party.map((member) => [
      member.slug,
      {
        responses: { ...member.responses },
        phone: member.phone ? formatPhone(member.phone) : '',
        hasDietary: Boolean(member.dietary),
        dietary: member.dietary ?? '',
      },
    ]),
  );
}

function ChoiceButtons({
  name,
  value,
  onChange,
  yesLabel,
  noLabel,
  labelledBy,
}: {
  name: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  yesLabel: string;
  noLabel: string;
  labelledBy: string;
}) {
  return (
    <div className="rsvp-choice" role="radiogroup" aria-labelledby={labelledBy}>
      {[true, false].map((option) => (
        <label
          key={String(option)}
          className={`rsvp-choice__option${value === option ? ' is-selected' : ''}${
            option ? ' rsvp-choice__option--yes' : ' rsvp-choice__option--no'
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option ? yesLabel : noLabel}
        </label>
      ))}
    </div>
  );
}

interface RsvpFlowProps {
  data: PartyRsvpResponse;
  formId: string;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onSave: (update: RsvpUpdateRequest) => Promise<PartyRsvpResponse>;
  onClose: () => void;
}

/** The form itself. Mounted only once the party has loaded, so its state seeds from `data`. */
function RsvpFlow({ data, formId, saving, setSaving, onSave, onClose }: RsvpFlowProps) {
  const party = data.party;
  const self = data.self;
  const [step, setStep] = useState<Step>(party.length > 1 ? 'who' : 'respond');
  const [selected, setSelected] = useState<Set<string>>(() => new Set([self]));
  const [mode, setMode] = useState<Mode>(() => {
    const me = party.find((member) => member.slug === self);
    return me && isMixed(me) ? 'perEvent' : 'all';
  });
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => initialDrafts(party));
  const [error, setError] = useState<{ message: string; guest?: string } | null>(null);

  const selectedMembers = party.filter((member) => selected.has(member.slug));

  const toggleSelected = (slug: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const updateDraft = (slug: string, change: (draft: Draft) => Draft) => {
    setDrafts((current) => ({ ...current, [slug]: change(current[slug]) }));
    if (error?.guest === slug) setError(null);
  };

  const setAll = (member: PartyMemberRsvp, attending: boolean) =>
    updateDraft(member.slug, (draft) => ({
      ...draft,
      responses: Object.fromEntries(member.events.map((slug) => [slug, attending])),
    }));

  const setOne = (member: PartyMemberRsvp, event: string, attending: boolean) =>
    updateDraft(member.slug, (draft) => ({
      ...draft,
      responses: { ...draft.responses, [event]: attending },
    }));

  const goToRespond = () => {
    setError(null);
    // Event-by-event is the only way to show someone's mixed answers faithfully.
    if (selectedMembers.some(isMixed)) setMode('perEvent');
    setStep('respond');
  };

  /** First selected guest who is attending something but has no valid phone number yet. */
  const missingPhoneFor = selectedMembers.find((member) => {
    const draft = drafts[member.slug];
    return attendsAny(member, draft) && !normalizePhone(draft.phone);
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const guests: GuestRsvpUpdate[] = [];
    for (const member of selectedMembers) {
      const draft = drafts[member.slug];
      const name = member.first;
      let responses: Record<string, boolean>;
      if (mode === 'all') {
        const choice = allChoice(draft, member.events);
        if (choice === undefined) {
          setError({ message: `Choose whether ${name} is attending.`, guest: member.slug });
          return;
        }
        responses = Object.fromEntries(member.events.map((slug) => [slug, choice]));
      } else {
        responses = Object.fromEntries(
          member.events
            .filter((slug) => draft.responses[slug] !== undefined)
            .map((slug) => [slug, draft.responses[slug] as boolean]),
        );
        if (Object.keys(responses).length === 0) {
          setError({ message: `Answer at least one event for ${name}.`, guest: member.slug });
          return;
        }
      }

      const attending = Object.values(responses).some(Boolean);
      const phone = draft.phone.trim();
      if (attending && !phone) {
        setError({ message: `Add a phone number for ${name}.`, guest: member.slug });
        return;
      }
      if (phone && !normalizePhone(phone)) {
        setError({ message: `That phone number for ${name} doesn’t look right.`, guest: member.slug });
        return;
      }
      guests.push({
        slug: member.slug,
        responses,
        ...(phone ? { phone } : {}),
        // Only asked of guests who are attending; a decline leaves any stored answer alone.
        // Unticking the option clears any stored answer.
        ...(attending ? { dietary: draft.hasDietary ? draft.dietary.trim() : '' } : {}),
      });
    }

    setSaving(true);
    try {
      const result = await onSave({ guests });
      setDrafts(initialDrafts(result.party));
      setStep('done');
    } catch (caught) {
      const apiError = caught instanceof RsvpApiError ? caught : null;
      setError({
        message: apiError?.message ?? 'Something went wrong. Please try again.',
        guest: apiError?.guest,
      });
    } finally {
      setSaving(false);
    }
  };

if (step === 'done') {
    const saved = party.filter((member) => selected.has(member.slug));
    return (
      <div className="rsvp-modal__done">
        <p className="rsvp-modal__lead">Thank you! Your RSVP is saved.</p>
        <ul className="rsvp-summary">
          {saved.map((member) => (
            <li key={member.slug} className="rsvp-summary__row">
              <span className="rsvp-summary__name">
                {member.first} {member.last}
              </span>
              <StatusChip member={member} />
            </li>
          ))}
        </ul>
        <p className="rsvp-modal__hint">You can change it any time from the Schedule page.</p>
        <div className="rsvp-modal__footer">
          <button type="button" className="rsvp-button rsvp-button--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === 'who') {
    return (
      <>
        <p className="rsvp-modal__lead">Who are you responding for?</p>
        <ul className="rsvp-party">
          {party.map((member) => (
            <li key={member.slug}>
              <label className={`rsvp-party__row${selected.has(member.slug) ? ' is-selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(member.slug)}
                  onChange={() => toggleSelected(member.slug)}
                />
                <span className="rsvp-party__name">
                  {member.first} {member.last}
                  {member.slug === self && <span className="rsvp-party__you"> (you)</span>}
                </span>
                <StatusChip member={member} />
              </label>
            </li>
          ))}
        </ul>
        <div className="rsvp-modal__footer">
          <button
            type="button"
            className="rsvp-button rsvp-button--primary"
            disabled={selected.size === 0}
            onClick={goToRespond}
          >
            Continue
          </button>
        </div>
      </>
    );
  }

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate>
      <div className="rsvp-mode" role="radiogroup" aria-label="How would you like to respond?">
        {(
          [
            ['all', 'All events'],
            ['perEvent', 'Event by event'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className={`rsvp-mode__option${mode === value ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name={`${formId}-mode`}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {label}
          </label>
        ))}
      </div>

      {selectedMembers.map((member) => {
        const draft = drafts[member.slug];
        const headingId = `${formId}-${member.slug}`;
        const choice = allChoice(draft, member.events);
        const attendingAny = attendsAny(member, draft);
        const phoneValue = draft.phone.trim();
        const phoneInvalid = phoneValue !== '' && !normalizePhone(phoneValue);
        const hasError = error?.guest === member.slug;
        return (
          <fieldset
            key={member.slug}
            className={`rsvp-guest${hasError ? ' has-error' : ''}`}
            aria-describedby={hasError ? `${formId}-error` : undefined}
          >
            <legend className="rsvp-guest__name" id={headingId}>
              {member.first} {member.last}
              {member.slug === self && <span className="rsvp-party__you"> (you)</span>}
            </legend>

            {mode === 'all' ? (
              <>
                <ChoiceButtons
                  name={`${formId}-${member.slug}-all`}
                  value={choice}
                  onChange={(value) => setAll(member, value)}
                  yesLabel="Joyfully accepts"
                  noLabel="Regretfully declines"
                  labelledBy={headingId}
                />
                <p className="rsvp-guest__hint">
                  {member.events.length === 1
                    ? `For ${EVENTS[member.events[0]].name}.`
                    : `For all ${member.events.length} events ${member.first} is invited to.`}
                  {choice === undefined && member.events.some((slug) => draft.responses[slug] !== undefined)
                    ? ' Answers currently differ by event — choosing here replaces them all.'
                    : ''}
                </p>
              </>
            ) : (
              <ul className="rsvp-events">
                {member.events.map((slug) => {
                  const eventLabelId = `${headingId}-${slug}`;
                  return (
                    <li key={slug} className="rsvp-events__row">
                      <div className="rsvp-events__label" id={eventLabelId}>
                        <span className="rsvp-events__name">{EVENTS[slug].name}</span>
                        <span className="rsvp-events__when">{formatEventWhen(slug)}</span>
                      </div>
                      <ChoiceButtons
                        name={`${formId}-${member.slug}-${slug}`}
                        value={draft.responses[slug]}
                        onChange={(value) => setOne(member, slug, value)}
                        yesLabel="Yes"
                        noLabel="No"
                        labelledBy={eventLabelId}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {attendingAny && (
              <label className={`rsvp-phone${phoneInvalid ? ' is-invalid' : ''}`}>
                <span className="rsvp-phone__label">
                  Mobile number
                  <span className="rsvp-phone__required" aria-hidden="true">
                    {' '}
                    *
                  </span>
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete={member.slug === self ? 'tel' : 'off'}
                  value={draft.phone}
                  required
                  aria-required="true"
                  aria-invalid={phoneInvalid || phoneValue === ''}
                  aria-describedby={phoneInvalid ? `${headingId}-phone-hint` : undefined}
                  onChange={(e) => {
                    const phone = e.target.value;
                    updateDraft(member.slug, (current) => ({ ...current, phone }));
                  }}
                />
                {phoneInvalid && (
                  <span className="rsvp-phone__hint" id={`${headingId}-phone-hint`}>
                    Enter a full phone number, e.g. 415 555 0123.
                  </span>
                )}
              </label>
            )}

            {attendingAny && (
              <div className="rsvp-dietary">
                <label className="rsvp-dietary__toggle">
                  <input
                    type="checkbox"
                    checked={draft.hasDietary}
                    onChange={(e) => {
                      const hasDietary = e.target.checked;
                      updateDraft(member.slug, (current) => ({ ...current, hasDietary }));
                      // Ticking it reveals the field; put the cursor there once it renders.
                      if (hasDietary) {
                        requestAnimationFrame(() =>
                          document.getElementById(`${headingId}-dietary`)?.focus(),
                        );
                      }
                    }}
                  />
                  Dietary restrictions
                </label>
                {draft.hasDietary && (
                  <input
                    id={`${headingId}-dietary`}
                    className="rsvp-dietary__input"
                    type="text"
                    autoComplete="off"
                    maxLength={DIETARY_MAX_LENGTH}
                    aria-label={`Dietary restrictions for ${member.first}`}
                    value={draft.dietary}
                    onChange={(e) => {
                      const dietary = e.target.value;
                      updateDraft(member.slug, (current) => ({ ...current, dietary }));
                    }}
                  />
                )}
              </div>
            )}
          </fieldset>
        );
      })}

      {error && (
        <p className="rsvp-modal__error" id={`${formId}-error`} role="alert">
          {error.message}
        </p>
      )}

      <div className="rsvp-modal__footer">
        {party.length > 1 && (
          <button
            type="button"
            className="rsvp-button"
            onClick={() => {
              setError(null);
              setStep('who');
            }}
            disabled={saving}
          >
            Back
          </button>
        )}
        {missingPhoneFor && (
          <p className="rsvp-modal__footer-note" id={`${formId}-save-note`}>
            Add a mobile number for {missingPhoneFor.first} to save.
          </p>
        )}
        <button
          type="submit"
          className="rsvp-button rsvp-button--primary"
          disabled={saving || Boolean(missingPhoneFor)}
          aria-describedby={missingPhoneFor ? `${formId}-save-note` : undefined}
        >
          {saving ? 'Saving…' : 'Save RSVP'}
        </button>
      </div>
    </form>
  );
}

export function RsvpModal({
  data,
  loading,
  loadError,
  onRetry,
  onSave,
  onSignInAgain,
  onClose,
}: RsvpModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const titleId = `${formId}-title`;
  const [saving, setSaving] = useState(false);

  // Open as a modal on mount; the parent unmounts this component to close it.
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

  // Clicks on the backdrop land on the <dialog> itself; clicks inside land on its children.
  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget && !saving) onClose();
  };

  let body;
  if (data) {
    body = (
      <RsvpFlow
        data={data}
        formId={formId}
        saving={saving}
        setSaving={setSaving}
        onSave={onSave}
        onClose={onClose}
      />
    );
  } else if (loadError) {
    body = (
      <div className="rsvp-modal__message">
        <p>{loadError.message}</p>
        {loadError.status === 401 ? (
          <button type="button" className="rsvp-button rsvp-button--primary" onClick={onSignInAgain}>
            Sign in again
          </button>
        ) : (
          <button type="button" className="rsvp-button rsvp-button--primary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <div className="rsvp-modal__message" aria-live="polite">
        <p>{loading ? 'Loading your RSVP…' : 'Preparing your RSVP…'}</p>
      </div>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="rsvp-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={handleDialogClick}
    >
      <div className="rsvp-modal__panel">
        <header className="rsvp-modal__header">
          <h2 className="rsvp-modal__title" id={titleId}>
            RSVP
          </h2>
          <button
            type="button"
            className="rsvp-modal__close"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="rsvp-modal__body">{body}</div>
      </div>
    </dialog>
  );
}
