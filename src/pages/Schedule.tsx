import { useCallback, useEffect, useRef, useState, useMemo, type CSSProperties } from 'react';
import { Button } from '../components/Button';
import { HomeHeader } from '../components/HomeHeader';
import { RsvpStatusButton } from '../components/RsvpStatusButton';
import { EVENT_TIME_ZONE, EVENTS } from '../config/events';
import { useGuest } from '../hooks/useGuest';
import { useReveal } from '../hooks/useReveal';
import type { Event } from '../types';
import { resolveAsset } from '../utils/asset';
import { cloudinaryUrl, isCloudinaryId } from '../utils/cloudinary';

const HERO_PUBLIC_ID = 'wed/schedule/hero';

/** vine-frame.svg as a CSS mask, so the vine takes the frame's color (see `.schedule__day-card-vine`). */
const vineMask = { '--vine-mask': `url(${resolveAsset('/vine-frame.svg')})` } as CSSProperties;

/*
 * Every formatter below pins `timeZone` to the venue: a guest reading the schedule from another
 * country still sees the local start time, on the local day.
 */

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: EVENT_TIME_ZONE,
});

const dateHeadingFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  weekday: 'long',
  timeZone: EVENT_TIME_ZONE,
});

const dateShortFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  timeZone: EVENT_TIME_ZONE,
});

/** en-CA renders as `YYYY-MM-DD`, which is all this key needs to be. */
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: EVENT_TIME_ZONE,
});

/** "5 PM", "11:30 AM": the CSS sets it in letterspaced small caps. */
function formatTime(date: Date): string {
  const parts = timeFormatter.formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
  const period = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toUpperCase();
  if (minute === '00') return `${hour} ${period}`;
  return `${hour}:${minute} ${period}`;
}

/** Splits the day heading into the weekday title and the date line beneath it. */
function formatDateHeading(date: Date): { weekday: string; date: string } {
  const parts = dateHeadingFormatter.formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return { weekday, date: `${month} ${day}, ${year}` };
}

function formatDateShort(date: Date): string {
  return dateShortFormatter.format(date);
}

function dateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

type DateGroup = {
  key: string;
  weekday: string;
  dateLabel: string;
  shortLabel: string;
  events: Event[];
};

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
      const heading = formatDateHeading(event.start_time);
      groups.push({
        key,
        weekday: heading.weekday,
        dateLabel: heading.date,
        shortLabel: formatDateShort(event.start_time),
        events: [],
      });
    }
    groups[groups.length - 1].events.push(event);
  }
  return groups;
}

function ScheduleTimeline({
  groups,
  activeIndex,
  dotProgress,
  isVisible,
  onLabelClick,
  onDragStart,
  onDragProgress,
  onDragEnd,
  onHoverStart,
  onHoverEnd,
}: {
  groups: DateGroup[];
  activeIndex: number;
  dotProgress: number;
  isVisible: boolean;
  onLabelClick: (i: number) => void;
  onDragStart: () => void;
  onDragProgress: (progress: number) => void;
  onDragEnd: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const SLOT_HEIGHT = 140;
  const totalHeight = Math.max((groups.length - 1) * SLOT_HEIGHT, 0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* fallback ok */
    }
    onDragStart();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.height === 0) return;
    const progress = Math.max(
      0,
      Math.min(1, (e.clientY - rect.top) / rect.height),
    );
    onDragProgress(progress);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* fallback ok */
    }
    onDragEnd();
  };

  return (
    <div
      className={`schedule-timeline${isVisible ? ' schedule-timeline--visible' : ''}`}
    >
      <div
        ref={trackRef}
        className="schedule-timeline__track"
        style={{ height: totalHeight }}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
      >
        <div className="schedule-timeline__line" aria-hidden="true" />
        <div
          className="schedule-timeline__dot"
          style={{ top: `${dotProgress * 100}%` }}
          role="slider"
          aria-label="Timeline scroll position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(dotProgress * 100)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {groups.map((group, i) => (
          <button
            key={group.key}
            type="button"
            className={`schedule-timeline__label${
              i === activeIndex ? ' schedule-timeline__label--active' : ''
            }`}
            style={{
              top:
                groups.length > 1
                  ? `${(i / (groups.length - 1)) * 100}%`
                  : '50%',
            }}
            onClick={() => onLabelClick(i)}
          >
            {group.shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
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

  const dayHeaderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  useReveal(contentRef, dateGroups);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [pastFirstHeader, setPastFirstHeader] = useState(false);
  const [dotProgress, setDotProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => setIsScrolling(false), 1500);

      const refs = dayHeaderRefs.current;

      if (refs[0]) {
        setPastFirstHeader(refs[0].getBoundingClientRect().top <= 0);
      }

      let active = 0;
      for (let i = 0; i < refs.length; i++) {
        if (refs[i] && refs[i]!.getBoundingClientRect().top <= 80) active = i;
      }
      setActiveGroupIndex(active);

      if (refs.length >= 2 && refs[0] && refs[refs.length - 1]) {
        const first =
          refs[0]!.getBoundingClientRect().top + window.scrollY;
        const last =
          refs[refs.length - 1]!.getBoundingClientRect().top + window.scrollY;
        const progress = Math.min(
          1,
          Math.max(0, (window.scrollY - first) / (last - first)),
        );
        setDotProgress(progress);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  const scrollToDate = useCallback((index: number) => {
    const ref = dayHeaderRefs.current[index];
    if (!ref) return;
    const y = ref.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleHoverStart = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setIsHovering(false);
  }, []);

  const handleDragProgress = useCallback((progress: number) => {
    const refs = dayHeaderRefs.current;
    if (refs.length < 2 || !refs[0] || !refs[refs.length - 1]) return;
    const firstY = refs[0]!.getBoundingClientRect().top + window.scrollY;
    const lastY =
      refs[refs.length - 1]!.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: firstY + progress * (lastY - firstY),
      behavior: 'auto',
    });
  }, []);

  return (
    <main className="home-page home-page--schedule">
      <HomeHeader activePath="/schedule" />
      <section className="schedule">
        <ScheduleTimeline
        groups={dateGroups}
        activeIndex={activeGroupIndex}
        dotProgress={dotProgress}
        isVisible={
          isHovering || (pastFirstHeader && (isScrolling || isDragging))
        }
        onLabelClick={scrollToDate}
        onDragStart={handleDragStart}
        onDragProgress={handleDragProgress}
        onDragEnd={handleDragEnd}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
      />

      <h1 className="schedule__title">Schedule</h1>

      <div className="schedule__actions">
        <RsvpStatusButton textClassName="schedule__action" />
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

      <div className="schedule__content" ref={contentRef}>
        {dateGroups.map((group, i) => (
          <div
            key={group.key}
            className="schedule__day"
            ref={(el) => {
              dayHeaderRefs.current[i] = el;
            }}
          >
            <h2 className="schedule__day-header" data-reveal="">
              <button
                type="button"
                className="schedule__day-header-button"
                onClick={() => scrollToDate(i)}
              >
                <span className="schedule__day-weekday">{group.weekday}</span>
                <span className="schedule__day-date">{group.dateLabel}</span>
              </button>
            </h2>

            <div className="schedule__day-card">
              <span
                className="schedule__day-card-vine schedule__day-card-vine--top"
                aria-hidden="true"
              >
                <span className="schedule__day-card-vine-art" style={vineMask} />
              </span>
              <span
                className="schedule__day-card-vine schedule__day-card-vine--bottom"
                aria-hidden="true"
              >
                <span className="schedule__day-card-vine-art" style={vineMask} />
              </span>
              {group.events.map((event, j) => {
                const sideClass = event.image
                  ? j % 2 === 0
                    ? 'schedule__event--image-left'
                    : 'schedule__event--image-right'
                  : 'schedule__event--no-image';
                const isLast = j === group.events.length - 1;

                return (
                  <div
                    key={event.slug}
                    className={`schedule__event ${sideClass}`}
                    data-reveal=""
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
                        <time
                          className="schedule__event-time"
                          dateTime={event.start_time.toISOString()}
                        >
                          {formatTime(event.start_time)}
                        </time>
                        <p className="schedule__event-name">{event.name}</p>
                        <p className="schedule__event-meta">
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
    </main>
  );
}
