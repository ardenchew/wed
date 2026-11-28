import { useOpenRsvp } from '../hooks/useOpenRsvp';
import { useRsvp } from '../hooks/useRsvp';
import { rsvpStatus } from '../rsvp/shared';

interface RsvpStampProps {
  /** False while it's still tucked in the envelope: shown, but not clickable or focusable. */
  interactive: boolean;
}

/**
 * A postage stamp stuck on the corner of Home's polaroid stack, asking the guest to RSVP. It
 * only appears once their RSVP has loaded and they haven't answered yet; like the site's other
 * RSVP buttons, it opens the RSVP modal on the Schedule page.
 */
export function RsvpStamp({ interactive }: RsvpStampProps) {
  const { myRsvp } = useRsvp();
  const openRsvp = useOpenRsvp();
  if (!myRsvp || rsvpStatus(myRsvp) !== 'pending') return null;

  return (
    <button
      type="button"
      className="rsvp-stamp"
      onClick={openRsvp}
      tabIndex={interactive ? undefined : -1}
      aria-hidden={interactive ? undefined : true}
      data-interactive={interactive || undefined}
    >
      <span className="rsvp-stamp__paper" aria-hidden="true" />
      <span className="rsvp-stamp__face">
        <span className="rsvp-stamp__label">RSVP</span>
      </span>
    </button>
  );
}
