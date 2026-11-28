import { createContext } from 'react';
import type { ApiError } from '../api/client';
import type { Event } from '../types';

export interface EventsContextType {
  /** The signed-in guest's invited events in schedule order; null until first loaded. */
  events: Event[] | null;
  loading: boolean;
  loadError: ApiError | null;
  reload: () => void;
}

export const EventsContext = createContext<EventsContextType | undefined>(undefined);
