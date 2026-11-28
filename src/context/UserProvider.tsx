import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { FreshLoadSplash } from '../components/FreshLoadSplash';
import { GUESTS } from '../config/guests';
import type { Guest, UserContextType } from '../types';
import { UserContext } from './UserContext';

const STORAGE_KEY = 'wed_user';

interface Session {
  user: Guest;
  /**
   * Kept so the RSVP API can authenticate requests. It adds no exposure: every password is
   * already in the public bundle (`src/config/authUsers.ts`).
   */
  password: string;
}

function loadInitialSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { slug?: string; password?: string } | null;
    // Sessions saved before the RSVP API have no password; those guests sign in again once.
    if (parsed?.slug && parsed.password && GUESTS[parsed.slug]) {
      return { user: GUESTS[parsed.slug], password: parsed.password };
    }
  } catch (error) {
    console.error('Failed to load user from localStorage:', error);
  }
  return null;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [signOutSplashKey, setSignOutSplashKey] = useState(0);
  const [signOutSplashActive, setSignOutSplashActive] = useState(false);
  const [session, setSession] = useState<Session | null>(loadInitialSession);
  const user = session?.user ?? null;
  const password = session?.password ?? null;

  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ slug: session.user.slug, password: session.password }),
        );
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  const signIn = useCallback((guest: Guest, guestPassword: string) => {
    setSession({ user: guest, password: guestPassword });
  }, []);

  const signOut = useCallback(() => {
    setSignOutSplashKey((key) => key + 1);
    setSession(null);
    setSignOutSplashActive(true);
  }, []);

  const completeSignOutAfterSplash = useCallback(() => {
    setSignOutSplashActive(false);
  }, []);

  const value = useMemo<UserContextType>(
    () => ({ user, password, signIn, signOut }),
    [user, password, signIn, signOut],
  );

  return (
    <UserContext.Provider value={value}>
      {signOutSplashActive && (
        <FreshLoadSplash
          key={signOutSplashKey}
          onComplete={completeSignOutAfterSplash}
        />
      )}
      {children}
    </UserContext.Provider>
  );
}
