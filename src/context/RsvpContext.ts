import { createContext } from 'react';
import type { PartyRsvpsState } from '../hooks/usePartyRsvps';
import type { PartyMemberRsvp } from '../rsvp/shared';

export interface RsvpContextType extends PartyRsvpsState {
  /** The signed-in guest's own RSVP, once loaded. */
  myRsvp: PartyMemberRsvp | null;
  /** Opens the RSVP modal over whatever page is showing. */
  openRsvp: () => void;
}

export const RsvpContext = createContext<RsvpContextType | undefined>(undefined);
