import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { ApiError } from '../api/client';
import { fetchMe } from '../api/guests';
import { FreshLoadSplash } from '../components/FreshLoadSplash';
import type { Guest, UserContextType } from '../types';
import { UserContext } from './UserContext';

const STORAGE_KEY = 'wed_user';

interface Session {
  /** Cached copy of `GET /me`, so pages render immediately; refreshed from the API on load. */
  user: Guest;
  /** Sent with every API call (HTTP Basic auth). */
  password: string;
}

function loadInitialSession(): Session | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { password?: string; guest?: Guest } | null;
    // Older sessions (guest data from the bundle, or no password) have no cached profile; those
    // guests sign in once more.
    if (parsed?.password && parsed.guest?.slug && Array.isArray(parsed.guest.events)) {
      return { user: parsed.guest, password: parsed.password };
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
  const slug = user?.slug;

  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ password: session.password, guest: session.user }),
        );
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  // Refresh the cached profile once per sign-in, so admin edits (welcome text, invitations,
  // password) reach guests who are already signed in. A 401 means the password was changed or
  // the guest was removed; anything else (offline) keeps the cached copy.
  useEffect(() => {
    if (!slug || !password) return;
    let cancelled = false;
    fetchMe({ slug, password }).then(
      (fresh) => {
        if (!cancelled) setSession({ user: fresh, password });
      },
      (error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 401) setSession(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, password]);

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
