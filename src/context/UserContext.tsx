/**
 * User Context
 * 
 * Provides authentication state management for the application
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserContextType } from '../types';

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'wed_user';

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
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

  const signIn = (userData: User) => {
    setUser(userData);
  };

  const signOut = () => {
    setUser(null);
  };

  const value: UserContextType = {
    user,
    signIn,
    signOut,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
