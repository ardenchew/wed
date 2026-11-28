import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiError } from '../api/client';
import { fetchMyEvents, toEvent } from '../api/events';
import type { ApiEvent } from '../events/shared';
import { useUser } from '../hooks/useUser';
import { EventsContext, type EventsContextType } from './EventsContext';

const STORAGE_KEY = 'wed_events';

interface Result {
  /** Which request this answers; `loading` is true until it matches the current one. */
  key: string;
  /** Whose events these are, so another guest's are never shown after switching accounts. */
  slug: string;
  events: ApiEvent[] | null;
  error: ApiError | null;
}

/** The last events seen on this device, so the schedule renders at once on a return visit. */
function loadCached(): Result | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as
      | { slug?: string; events?: ApiEvent[] }
      | null;
    if (parsed?.slug && Array.isArray(parsed.events)) {
      return { key: '', slug: parsed.slug, events: parsed.events, error: null };
    }
  } catch {
    /* no cache */
  }
  return null;
}

/**
 * Loads the signed-in guest's invited events once per sign-in for the whole app (the API only
 * ever returns those, never the others). Like the profile in UserProvider, the last copy is
 * cached so pages show it straight away while the fresh one loads.
 */
export function EventsProvider({ children }: { children: ReactNode }) {
  const { user, password } = useUser();
  const slug = user?.slug;
  const [attempt, setAttempt] = useState(0);
  // Refetch when the profile refresh in UserProvider brings changed invitations.
  const invited = user?.events.join(',') ?? '';
  const requestKey = slug && password ? `${slug}#${invited}#${attempt}` : null;
  const [result, setResult] = useState<Result | null>(loadCached);

  useEffect(() => {
    if (!slug || !password || !requestKey) return;
    let cancelled = false;
    fetchMyEvents({ slug, password }).then(
      (events) => {
        if (cancelled) return;
        setResult({ key: requestKey, slug, events, error: null });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug, events }));
        } catch {
          /* storage full or blocked: fine, just no cache */
        }
      },
      (error: ApiError) => {
        // Keep showing the last good copy if a reload fails.
        if (!cancelled) {
          setResult((prev) => ({
            key: requestKey,
            slug,
            events: prev?.slug === slug ? prev.events : null,
            error,
          }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, password, requestKey]);

  useEffect(() => {
    if (!slug) localStorage.removeItem(STORAGE_KEY);
  }, [slug]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const apiEvents = result && result.slug === slug ? result.events : null;
  const events = useMemo(() => (apiEvents ? apiEvents.map(toEvent) : null), [apiEvents]);
  const loading = requestKey !== null && result?.key !== requestKey;
  const loadError = result?.key === requestKey ? result.error : null;

  const value = useMemo<EventsContextType>(
    () => ({ events, loading, loadError, reload }),
    [events, loading, loadError, reload],
  );
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
