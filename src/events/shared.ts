/**
 * Event types and rules shared by the site and the API Worker. Keep this file free of browser-
 * and Worker-only APIs: both bundles import it.
 *
 * Times are entered and shown as wall-clock times at the venue (`EVENT_TIME_ZONE`) and stored as
 * UTC instants. The conversion goes through `Intl`, so the PDT/PST switch is handled by the time
 * zone database rather than a fixed offset.
 */
import { EVENT_TIME_ZONE } from '../config/events';

export { EVENT_TIME_ZONE };

/** An event as the API returns it. Times are ISO 8601 UTC strings. */
export interface ApiEvent {
  slug: string;
  name: string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string;
  attire: string | null;
  /** Cloudinary public id, e.g. `wed/schedule/courthouse`. */
  image: string | null;
  map_link: string | null;
}

/** An event as the admin page sees it: details, who's invited, and how they answered. */
export interface AdminEvent extends ApiEvent {
  /** Invited guest slugs. */
  invited: string[];
  /** Guest slug → attending, for invited guests who have answered. */
  responses: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Body of `POST /admin/events` and `PUT /admin/events/:slug`. Date and times are venue time, as
 * the form's pickers give them: `YYYY-MM-DD` and `HH:MM` (24-hour).
 */
export interface EventInput {
  name: string;
  date: string;
  startTime: string;
  /** Empty = no end time. Earlier than `startTime` means it ends the next day. */
  endTime: string;
  location: string;
  description: string;
  attire: string;
  image: string;
  mapLink: string;
  /** Exactly who is invited; replaces the current invitations. */
  guests: string[];
}

/** What validation hands the API: the input tidied, with the times resolved to UTC. */
export interface CleanEventInput extends EventInput {
  start: Date;
  end: Date | null;
}

export const EVENT_LIMITS = {
  name: 80,
  location: 120,
  description: 2000,
  attire: 80,
  image: 200,
  mapLink: 500,
  guests: 1000,
} as const;

const venueFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The venue's wall-clock date (`YYYY-MM-DD`) and time (`HH:MM`) at an instant. */
export function toVenueTime(instant: Date): { date: string; time: string } {
  const parts = venueFormatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** Adds `days` to a `YYYY-MM-DD` date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * The instant a venue wall-clock time names, or null if it isn't a real date and time there —
 * including the hour skipped when clocks spring forward. In the repeated hour when they fall
 * back, it's whichever of the two the offset search lands on first.
 */
export function fromVenueTime(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const wall = Date.UTC(y, mo - 1, da, h, mi);
  if (Number.isNaN(wall)) return null;

  // Start by reading the wall time as UTC, then shift by however far the venue's clock is off
  // from it. Twice covers an offset change between the guess and the answer.
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const seen = toVenueTime(new Date(guess));
    const [sy, smo, sda] = seen.date.split('-').map(Number);
    const [sh, smi] = seen.time.split(':').map(Number);
    guess += wall - Date.UTC(sy, smo - 1, sda, sh, smi);
  }
  const instant = new Date(guess);
  const check = toVenueTime(instant);
  return check.date === date && check.time === time ? instant : null;
}

/** `Wine Tasting` → `wine_tasting`. Callers add a numeric suffix if it's taken. */
export function slugForEventName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'event';
}

/** Cloudinary public ids: letters, digits, `_ - . /`. */
export const CLOUDINARY_ID = /^[\w\-./]+$/;

/** The form's starting values for an event (or a blank form). */
export function eventToInput(event: AdminEvent | null): EventInput {
  const start = event ? toVenueTime(new Date(event.start_time)) : { date: '', time: '' };
  return {
    name: event?.name ?? '',
    date: start.date,
    startTime: start.time,
    endTime: event?.end_time ? toVenueTime(new Date(event.end_time)).time : '',
    location: event?.location ?? '',
    description: event?.description ?? '',
    attire: event?.attire ?? '',
    image: event?.image ?? '',
    mapLink: event?.map_link ?? '',
    guests: event?.invited ?? [],
  };
}

/**
 * Checks and tidies admin form input, resolving the venue times to UTC. Returns the cleaned
 * input, or an error message naming the first problem. The API runs this too, so the page and
 * server always agree. Whether each guest exists is the API's job.
 */
export function validateEventInput(input: EventInput): { value: CleanEventInput } | { error: string } {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const L = EVENT_LIMITS;
  const name = text(input?.name);
  const location = text(input?.location);
  const description = text(input?.description);
  const attire = text(input?.attire);
  const image = text(input?.image);
  const mapLink = text(input?.mapLink);
  const date = text(input?.date);
  const startTime = text(input?.startTime);
  const endTime = text(input?.endTime);

  if (!name) return { error: 'The event needs a name.' };
  if (name.length > L.name) return { error: `Keep the name under ${L.name} characters.` };
  if (!location) return { error: 'The event needs a location.' };
  if (location.length > L.location) return { error: `Keep the location under ${L.location} characters.` };
  if (description.length > L.description) return { error: 'The description is too long.' };
  if (attire.length > L.attire) return { error: `Keep the attire under ${L.attire} characters.` };

  if (!date || !startTime) return { error: 'Choose a date and start time.' };
  const start = fromVenueTime(date, startTime);
  if (!start) {
    return {
      error: /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(startTime)
        ? 'That start time doesn’t exist in California (clocks spring forward then). Pick another.'
        : 'Choose a valid date and start time.',
    };
  }
  let end: Date | null = null;
  if (endTime) {
    end = fromVenueTime(endTime < startTime ? addDays(date, 1) : date, endTime);
    if (!end) return { error: 'Choose a valid end time.' };
    if (end.getTime() <= start.getTime()) return { error: 'The end time must be after the start time.' };
  }

  if (image && (image.length > L.image || !CLOUDINARY_ID.test(image))) {
    return { error: `“${image}” doesn’t look like a Cloudinary image id.` };
  }
  if (mapLink) {
    let url: URL | null = null;
    try {
      url = new URL(mapLink);
    } catch {
      url = null;
    }
    if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:') || mapLink.length > L.mapLink) {
      return { error: 'The map link must be a full http(s):// address.' };
    }
  }

  if (!Array.isArray(input.guests)) return { error: 'Invalid guest list.' };
  const guests = [...new Set(input.guests)];
  if (guests.some((slug) => typeof slug !== 'string' || !slug)) return { error: 'Invalid guest list.' };
  if (guests.length > L.guests) return { error: 'Too many guests.' };

  return {
    value: { name, date, startTime, endTime, location, description, attire, image, mapLink, guests, start, end },
  };
}
