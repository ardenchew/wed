import type { Guest } from '../types';
import { useUser } from './useUser';

/** The signed-in guest's profile (welcome text, polaroids, invitations), or null. */
export function useGuest(): Guest | null {
  return useUser().user;
}
