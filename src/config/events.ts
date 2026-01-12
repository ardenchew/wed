/**
 * Event Configuration
 * 
 * Predefined events for the wedding
 */

import type { Event } from '../types';

export const EVENTS: Record<string, Event> = {
  courthouse: {
    slug: 'courthouse',
    name: 'Courthouse Wedding and Photographs',
    start_time: new Date('2026-09-24T15:00:00'),
    location: 'San Francisco City Hall',
    description: 'Intimate ceremony for immediate family.',
    attire: 'formal',
    rsvpable: true,
  },
  immediate_family_dinner: {
    slug: 'immediate_family_dinner',
    name: 'Dinner at Rich Table',
    start_time: new Date('2026-09-24T19:00:00'),
    location: 'Rich Table',
    description: "Small dinner at Em and Ard's San Francisco favorite Rich Table with the immediate family following the courthouse ceremony.",
    attire: 'semi-formal',
    rsvpable: true,
  },
};
