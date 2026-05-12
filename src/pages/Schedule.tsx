import { useMemo } from 'react';
import { Button } from '../components/Button';
import { EVENTS } from '../config/events';
import { useGuest } from '../hooks/useGuest';
import type { Event } from '../types';
import { resolveAsset } from '../utils/asset';
import { cloudinaryUrl, isCloudinaryId } from '../utils/cloudinary';

const HERO_PUBLIC_ID = 'wed/schedule/hero';

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

  const heroUrl = cloudinaryUrl(HERO_PUBLIC_ID, { w: 1200, c: 'limit' });

  return (
    <section className="schedule">
      <h1 className="schedule__title">Schedule</h1>

      <div className="schedule__actions">
        <Button variant="text" className="schedule__action">
          RSVP
        </Button>
        <span className="schedule__action-sep" aria-hidden="true">
          •
        </span>
        <Button variant="text" className="schedule__action">
          Export Calendar
        </Button>
      </div>

      <div className="schedule__hero">
        <img className="schedule__hero-image" src={heroUrl} alt="" />
      </div>

      <div className="schedule__content">
        {dateGroups.map((group) => (
          <div key={group.label} className="schedule__day">
            <h2 className="schedule__day-header">{group.label}</h2>

            <div className="schedule__day-card">
              <span
                className="schedule__day-card-vine schedule__day-card-vine--top"
                aria-hidden="true"
              >
                <img src={resolveAsset('/vine.svg')} alt="" />
              </span>
              <span
                className="schedule__day-card-vine schedule__day-card-vine--bottom"
                aria-hidden="true"
              >
                <img src={resolveAsset('/vine.svg')} alt="" />
              </span>
              {group.events.map((event, i) => {
                const sideClass = event.image
                  ? i % 2 === 0
                    ? 'schedule__event--image-left'
                    : 'schedule__event--image-right'
                  : 'schedule__event--no-image';
                const isLast = i === group.events.length - 1;

                return (
                  <div
                    key={event.slug}
                    className={`schedule__event ${sideClass}`}
                  >
                    <div className="schedule__event-row">
                      {event.image && (
                        <div className="schedule__event-image-wrap">
                          <img
                            className="schedule__event-image"
                            src={
                              isCloudinaryId(event.image)
                                ? cloudinaryUrl(event.image, { w: 600, c: 'limit' })
                                : resolveAsset(event.image)
                            }
                            alt={event.name}
                          />
                        </div>
                      )}
                      <div className="schedule__event-text">
                        <p className="schedule__event-name">{event.name}</p>
                        <p className="schedule__event-meta">
                          <span className="schedule__time-pill">
                            {formatTime(event.start_time)}
                          </span>
                          <span className="schedule__event-location">
                            {event.location}
                          </span>
                          {event.map_link && (
                            <a
                              className="schedule__event-map-link"
                              href={event.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${event.location} in maps`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                        </p>
                        {event.attire && (
                          <p className="schedule__event-attire">
                            Attire: {event.attire}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="schedule__event-description">
                      {event.description}
                    </p>

                    {!isLast && (
                      <span
                        className="schedule__event-connector"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
