import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
  return `${month} ${day}, ${year} · ${weekday}`;
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type DateGroup = { label: string; shortLabel: string; events: Event[] };

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
      groups.push({
        label: formatDateHeading(event.start_time),
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
            key={group.label}
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
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout>>();

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
        {dateGroups.map((group, i) => (
          <div
            key={group.label}
            className="schedule__day"
            ref={(el) => {
              dayHeaderRefs.current[i] = el;
            }}
          >
            <h2 className="schedule__day-header">
              <button
                type="button"
                className="schedule__day-header-button"
                onClick={() => scrollToDate(i)}
              >
                {group.label}
              </button>
            </h2>

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
