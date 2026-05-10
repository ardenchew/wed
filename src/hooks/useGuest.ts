import { GUESTS } from '../config/guests';
import { useUser } from '../context/UserContext';
import type { Guest } from '../types';

/** Resolved guest record. Falls back to the user object if no GUESTS entry exists for the slug. */
export function useGuest(): Guest | null {
  const { user } = useUser();
  if (!user) return null;
  return user.slug ? GUESTS[user.slug] ?? user : user;
}
