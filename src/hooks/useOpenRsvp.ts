import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useRsvp } from './useRsvp';

export const SCHEDULE_PATH = '/schedule';

/** Router state that asks the Schedule page to open the RSVP modal once it has appeared. */
export interface OpenRsvpState {
  openRsvp: true;
}

export function wantsRsvp(state: unknown): state is OpenRsvpState {
  return (state as OpenRsvpState | null)?.openRsvp === true;
}

/**
 * RSVP always happens on the Schedule page: from there the modal opens in place; from anywhere
 * else this navigates to Schedule, and `AppRoutes` opens the modal once the page transition ends.
 */
export function useOpenRsvp(): () => void {
  const { openRsvp } = useRsvp();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return useCallback(() => {
    if (pathname === SCHEDULE_PATH) openRsvp();
    else navigate(SCHEDULE_PATH, { state: { openRsvp: true } satisfies OpenRsvpState });
  }, [pathname, openRsvp, navigate]);
}
