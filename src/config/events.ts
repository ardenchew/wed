/**
 * The venue's time zone. Events live in the database (see src/events/shared.ts) with UTC times;
 * every page and form shows and takes them as wall-clock times here, not in the visitor's zone.
 */
export const EVENT_TIME_ZONE = 'America/Los_Angeles';
