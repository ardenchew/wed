import type { Event } from '../types';

/**
 * Every event time is a wall-clock time at the venue. Times below carry the matching UTC offset
 * (PDT, -07:00) so they resolve to the same instant everywhere, and the schedule formats them
 * back into this zone rather than the visitor's.
 */
export const EVENT_TIME_ZONE = 'America/Los_Angeles';

export const EVENTS: Record<string, Event> = {
  courthouse: {
    slug: 'courthouse',
    name: 'Courthouse Ceremony',
    start_time: new Date('2027-05-13T17:00:00-07:00'),
    location: 'San Francisco City Hall',
    description:
      'An intimate immediate family only gathering to formalize Emily and Arden’s marriage. Transportation will not be provided so please be sure to arrive on time. A photographer will be present.',
    attire: 'Formal',
    image: 'wed/schedule/courthouse',
    map_link: 'https://maps.app.goo.gl/W71EYgZxP38jK76J9',
  },
  immediate_family_dinner: {
    slug: 'immediate_family_dinner',
    name: 'Dinner',
    start_time: new Date('2027-05-13T20:00:00-07:00'),
    location: 'Rich Table',
    description:
      'Dinner at an Emily and Arden favorite with immediate family and significant others. We’ll head here straight from the courthouse ceremony, no need to change.',
    attire: 'Formal',
    image: 'wed/schedule/rich-table',
    map_link: 'https://maps.app.goo.gl/L9Zgzm99FJL5dAFU8',
  },
  bus_pick_up: {
    slug: 'bus_pick_up',
    name: 'Bus Pick Up',
    start_time: new Date('2027-05-14T10:00:00-07:00'),
    location: 'San Francisco',
    description: 'Don’t miss ur bus.',
    attire: 'Napa Summer Semi-Formal',
    image: 'wed/schedule/bus',
  },
  wine_tasting: {
    slug: 'wine_tasting',
    name: 'Wine Tasting',
    start_time: new Date('2027-05-14T11:00:00-07:00'),
    location: 'Stony Hill Vineyard',
    description: 'Tasty napa chardonay and cabernet.',
    attire: 'Napa Summer Semi-Formal',
    image: 'wed/schedule/stony-hill',
    map_link: 'https://maps.app.goo.gl/LDijnWx6u63XkbqZ9',
  },
  vineyard_dinner: {
    slug: 'vineyard_dinner',
    name: 'Vineyard Dinner',
    start_time: new Date('2027-05-14T16:00:00-07:00'),
    location: 'Brix',
    description: 'Tasty napa chardonay and cabernet.',
    attire: 'Napa Summer Semi-Formal',
    image: 'wed/schedule/brix',
    map_link: 'https://maps.app.goo.gl/TuDigVhhvdszTfif6',
  },
};
