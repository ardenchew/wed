/**
 * User Context
 * 
 * Provides authentication state management for the application
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { FreshLoadSplash } from '../components/FreshLoadSplash';
import type { Guest, UserContextType } from '../types';

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'wed_user';

interface UserProviderProps {
  children: ReactNode;
}

function SignOutSplashLayer({
  active,
  splashKey,
  onComplete,
}: {
  active: boolean;
  splashKey: number;
  onComplete: () => void;
}) {
  if (!active) return null;
  return <FreshLoadSplash key={splashKey} onComplete={onComplete} />;
}

export function UserProvider({ children }: UserProviderProps) {
  const signOutSplashKeyRef = useRef(0);
  const [signOutSplashActive, setSignOutSplashActive] = useState(false);

  const [user, setUser] = useState<Guest | null>(() => {
    // Load user from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
    return null;
  });

  useEffect(() => {
    // Persist user to localStorage whenever it changes
    if (user) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const signIn = (guest: Guest) => {
    setUser(guest);
  };

  const signOut = () => {
    signOutSplashKeyRef.current += 1;
    setUser(null);
    setSignOutSplashActive(true);
  };

  const completeSignOutAfterSplash = useCallback(() => {
    setSignOutSplashActive(false);
  }, []);

  const value: UserContextType = {
    user,
    signIn,
    signOut,
  };

  return (
    <UserContext.Provider value={value}>
      <SignOutSplashLayer
        active={signOutSplashActive}
        splashKey={signOutSplashKeyRef.current}
        onComplete={completeSignOutAfterSplash}
      />
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
