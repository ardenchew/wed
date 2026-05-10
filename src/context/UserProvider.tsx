import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { FreshLoadSplash } from '../components/FreshLoadSplash';
import { GUESTS } from '../config/guests';
import type { Guest, UserContextType } from '../types';
import { UserContext } from './UserContext';

const STORAGE_KEY = 'wed_user';

function loadInitialUser(): Guest | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { slug?: string } | null;
    if (parsed?.slug && GUESTS[parsed.slug]) return GUESTS[parsed.slug];
  } catch (error) {
    console.error('Failed to load user from localStorage:', error);
  }
  return null;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const signOutSplashKeyRef = useRef(0);
  const [signOutSplashActive, setSignOutSplashActive] = useState(false);
  const [user, setUser] = useState<Guest | null>(loadInitialUser);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: user.slug }));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const signIn = useCallback((guest: Guest) => {
    setUser(guest);
  }, []);

  const signOut = useCallback(() => {
    signOutSplashKeyRef.current += 1;
    setUser(null);
    setSignOutSplashActive(true);
  }, []);

  const completeSignOutAfterSplash = useCallback(() => {
    setSignOutSplashActive(false);
  }, []);

  const value = useMemo<UserContextType>(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return (
    <UserContext.Provider value={value}>
      {signOutSplashActive && (
        <FreshLoadSplash
          key={signOutSplashKeyRef.current}
          onComplete={completeSignOutAfterSplash}
        />
      )}
      {children}
    </UserContext.Provider>
  );
}
