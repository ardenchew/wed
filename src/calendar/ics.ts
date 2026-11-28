/**
 * Builds an iCalendar (RFC 5545) file from schedule events. Pure: no DOM, no clock (the caller
 * passes `now`), so it can run and be checked outside the browser.
 *
 * Times are written in UTC (`...Z`), so no VTIMEZONE block is needed and every calendar shows
 * each event at the right moment in its own zone (5 PM in San Francisco is 5 PM Pacific).
 */
import type { Event } from '../types';

export const CALENDAR_NAME = 'Emily & Arden’s Wedding';
export const CALENDAR_FILENAME = 'emily-arden-wedding.ics';
const PRODID = '-//Emily & Arden//Wedding Schedule//EN';
const UID_DOMAIN = 'emily-arden-wedding';

export interface CalendarRevision {
  /** Bumped whenever the events change; calendars use it to prefer the newer copy. */
  sequence: number;
  /** When the events last changed. */
  updated: Date;
}

/** `20270514T000000Z`. */
export function formatUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
}

/** Escapes a TEXT value: backslash, semicolon, comma, and newlines (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

const encoder = new TextEncoder();

/**
 * Folds a content line so no physical line exceeds 75 octets (RFC 5545 §3.1), continuing with
 * CRLF + space. Splits only between characters, never inside a multi-byte UTF-8 sequence.
 */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  // The first line may hold 75 octets; continuations lose one to the leading space.
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      out.push(current);
      current = '';
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += bytes;
  }
  out.push(current);
  return out.join('\r\n ');
}

export function eventUid(slug: string): string {
  return `${slug}@${UID_DOMAIN}`;
}

function eventDescription(event: Event): string {
  const parts = [event.description];
  if (event.attire) parts.push(`Attire: ${event.attire}`);
  if (event.map_link) parts.push(`Map: ${event.map_link}`);
  return parts.join('\n\n');
}

function eventLines(event: Event, revision: CalendarRevision, now: Date): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${eventUid(event.slug)}`,
    `DTSTAMP:${formatUtc(now)}`,
    `LAST-MODIFIED:${formatUtc(revision.updated)}`,
    `SEQUENCE:${revision.sequence}`,
    `DTSTART:${formatUtc(event.start_time)}`,
  ];
  // No DTEND: RFC 5545 §3.6.1 treats the event as ending when it starts.
  if (event.end_time) lines.push(`DTEND:${formatUtc(event.end_time)}`);
  lines.push(
    `SUMMARY:${escapeText(event.name)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(eventDescription(event))}`,
  );
  if (event.map_link) lines.push(`URL:${event.map_link}`);
  lines.push('END:VEVENT');
  return lines;
}

/** The whole `.ics` file: events in start order, CRLF line endings, lines folded. */
export function buildCalendar(
  events: Event[],
  revision: CalendarRevision,
  now: Date,
): string {
  const sorted = [...events].sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
  const lines = [
    'BEGIN:VCALENDAR',
    `PRODID:${PRODID}`,
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(CALENDAR_NAME)}`,
    ...sorted.flatMap((event) => eventLines(event, revision, now)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
