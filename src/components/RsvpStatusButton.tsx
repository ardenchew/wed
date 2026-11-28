import { useOpenRsvp } from '../hooks/useOpenRsvp';
import { useRsvp } from '../hooks/useRsvp';
import { rsvpStatus } from '../rsvp/shared';

const icons = {
  yes: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  no: <path d="M7 7l10 10M17 7L7 17" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
};

function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg className="rsvp-status__icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

interface RsvpStatusButtonProps {
  /** Extra classes for the plain "RSVP" text button (e.g. the page's own action styling). */
  textClassName?: string;
}

/**
 * RSVP indicator for Home and Schedule. Once the guest has answered it's a pill — "RSVP'd yes" or
 * "RSVP'd no" with an edit affordance (attending some-but-not-all events counts as yes). Until
 * then (and while loading, or if the status can't be loaded) it's the site's plain "RSVP" text
 * button. Every state opens the RSVP modal on the Schedule page (navigating there first if needed).
 */
export function RsvpStatusButton({ textClassName = '' }: RsvpStatusButtonProps) {
  const { myRsvp } = useRsvp();
  const openRsvp = useOpenRsvp();
  const status = myRsvp ? rsvpStatus(myRsvp) : 'pending';

  if (status === 'pending') {
    return (
      <button
        type="button"
        className={`ui-button ui-button--text ${textClassName}`.trim()}
        onClick={openRsvp}
      >
        RSVP
      </button>
    );
  }

  const state = status === 'no' ? 'no' : 'yes';
  const label = state === 'yes' ? 'RSVP’d yes' : 'RSVP’d no';

  return (
    <button
      type="button"
      className={`rsvp-status rsvp-status--${state}`}
      onClick={openRsvp}
      aria-label={`${label}. Edit RSVP`}
    >
      <Icon name={state} />
      <span className="rsvp-status__label">{label}</span>
      <span className="rsvp-status__edit">
        <Icon name="edit" />
      </span>
    </button>
  );
}
