import { useCallback, useEffect, useState } from 'react';
import type { ApiError } from '../api/client';
import {
  createEvent as apiCreateEvent,
  deleteEvent as apiDeleteEvent,
  fetchAdminEvents,
  updateEvent as apiUpdateEvent,
} from '../api/events';
import type { AdminEvent, EventInput } from '../events/shared';
import { useUser } from './useUser';

interface Result {
  key: string;
  events: AdminEvent[] | null;
  error: ApiError | null;
}

/** Every event (in schedule order) with who's invited, plus add / edit / remove, for the admin page. */
export function useAdminEvents() {
  const { user, password } = useUser();
  const slug = user?.slug;
  const [attempt, setAttempt] = useState(0);
  const requestKey = slug && password ? `${slug}#${attempt}` : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!slug || !password || !requestKey) return;
    let cancelled = false;
    fetchAdminEvents({ slug, password }).then(
      (events) => {
        if (!cancelled) setResult({ key: requestKey, events, error: null });
      },
      (error: ApiError) => {
        if (!cancelled) setResult((prev) => ({ key: requestKey, events: prev?.events ?? null, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, password, requestKey]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  /** Refetches without a loading state, after a write here or to a guest's invitations. */
  const refresh = useCallback(async () => {
    if (!slug || !password || !requestKey) return;
    const events = await fetchAdminEvents({ slug, password });
    setResult({ key: requestKey, events, error: null });
  }, [slug, password, requestKey]);

  const create = useCallback(
    async (input: EventInput) => {
      if (!slug || !password) throw new Error('Not signed in');
      const event = await apiCreateEvent({ slug, password }, input);
      await refresh();
      return event;
    },
    [slug, password, refresh],
  );

  const update = useCallback(
    async (eventSlug: string, input: EventInput) => {
      if (!slug || !password) throw new Error('Not signed in');
      const event = await apiUpdateEvent({ slug, password }, eventSlug, input);
      await refresh();
      return event;
    },
    [slug, password, refresh],
  );

  const remove = useCallback(
    async (eventSlug: string) => {
      if (!slug || !password) throw new Error('Not signed in');
      await apiDeleteEvent({ slug, password }, eventSlug);
      await refresh();
    },
    [slug, password, refresh],
  );

  return {
    events: result?.events ?? null,
    loading: requestKey !== null && result?.key !== requestKey,
    error: result?.key === requestKey ? result.error : null,
    reload,
    refresh,
    create,
    update,
    remove,
  };
}
