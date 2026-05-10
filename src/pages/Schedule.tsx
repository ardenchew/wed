import { useMemo } from 'react';
import { EVENTS } from '../config/events';
import { useGuest } from '../hooks/useGuest';
import type { Event } from '../types';
import { resolveAsset } from '../utils/asset';

const PLACEHOLDER_IMAGE = '/placeholder_event.svg';

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 || 12;
  if (minutes === 0) return `${displayHour}${period}`;
  return `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`;
}

function formatDateHeading(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    weekday: 'long',
  };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return `${month} ${day}, ${year} - ${weekday}`;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type DateGroup = { label: string; events: Event[] };

function groupEventsByDate(events: Event[]): DateGroup[] {
  const sorted = [...events].sort(
    (a, b) => a.start_time.getTime() - b.start_time.getTime(),
  );
  const groups: DateGroup[] = [];
  let currentKey = '';

  for (const event of sorted) {
    const key = dateKey(event.start_time);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ label: formatDateHeading(event.start_time), events: [] });
    }
    groups[groups.length - 1].events.push(event);
  }
  return groups;
}

export default function Schedule() {
  const guest = useGuest();

  const dateGroups = useMemo(() => {
    const guestEventSlugs = new Set(guest?.events ?? []);
    const accessible = Object.values(EVENTS).filter((e) =>
      guestEventSlugs.has(e.slug),
    );
    return groupEventsByDate(accessible);
  }, [guest?.events]);

  return (
    <section className="schedule">
      <div className="schedule__vine" aria-hidden="true" />

      <h1 className="schedule__title">Schedule</h1>

      <div className="schedule__content">
        {dateGroups.map((group) => (
          <div key={group.label} className="schedule__date-group">
            <div className="schedule__date-header">
              <span className="schedule__date-line" aria-hidden="true" />
              <span className="schedule__date-label">{group.label}</span>
              <span className="schedule__date-line" aria-hidden="true" />
            </div>

            {group.events.map((event) => (
              <div key={event.slug} className="schedule__event">
                <div className="schedule__event-left">
                  <div className="schedule__event-image-wrap">
                    <img
                      className="schedule__event-image"
                      src={resolveAsset(event.image ?? PLACEHOLDER_IMAGE)}
                      alt={event.name}
                    />
                  </div>
                </div>
                <div className="schedule__event-right">
                  <div className="schedule__event-details">
                    <p className="schedule__event-name">{event.name}</p>
                    <p className="schedule__event-meta">
                      {formatTime(event.start_time)}, {event.location}
                    </p>
                    {event.attire && (
                      <p className="schedule__event-meta">
                        Attire: {event.attire.charAt(0).toUpperCase() + event.attire.slice(1)}
                      </p>
                    )}
                  </div>
                  <p className="schedule__event-description">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
