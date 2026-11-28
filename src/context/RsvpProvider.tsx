import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { RsvpModal } from '../components/RsvpModal';
import { usePartyRsvps } from '../hooks/usePartyRsvps';
import { useUser } from '../hooks/useUser';
import { RsvpContext, type RsvpContextType } from './RsvpContext';

/**
 * Loads the signed-in guest's party RSVPs once for the whole app and owns the RSVP modal, so the
 * Home and Schedule indicators and the menu all share one fetch and one modal.
 */
export function RsvpProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useUser();
  const rsvps = usePartyRsvps();
  const [open, setOpen] = useState(false);

  const openRsvp = useCallback(() => setOpen(true), []);
  const closeRsvp = useCallback(() => setOpen(false), []);

  const myRsvp = rsvps.data?.party.find((member) => member.slug === rsvps.data?.self) ?? null;
  const value = useMemo<RsvpContextType>(
    () => ({ ...rsvps, myRsvp, openRsvp }),
    [rsvps, myRsvp, openRsvp],
  );

  return (
    <RsvpContext.Provider value={value}>
      {children}
      {open && user && (
        <RsvpModal
          data={rsvps.data}
          loading={rsvps.loading}
          loadError={rsvps.loadError}
          onRetry={rsvps.reload}
          onSave={rsvps.save}
          onSignInAgain={() => {
            closeRsvp();
            signOut();
          }}
          onClose={closeRsvp}
        />
      )}
    </RsvpContext.Provider>
  );
}
