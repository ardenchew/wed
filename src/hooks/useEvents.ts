import { useContext } from 'react';
import { EventsContext } from '../context/EventsContext';

/** The signed-in guest's invited events (see EventsProvider). */
export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
