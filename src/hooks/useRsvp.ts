import { useContext } from 'react';
import { RsvpContext } from '../context/RsvpContext';

export function useRsvp() {
  const context = useContext(RsvpContext);
  if (context === undefined) {
    throw new Error('useRsvp must be used within an RsvpProvider');
  }
  return context;
}
