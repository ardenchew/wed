import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ApiError } from '../api/client';
import {
  createGuest as apiCreateGuest,
  deleteGuest as apiDeleteGuest,
  fetchAdminGuests,
  updateGuest as apiUpdateGuest,
} from '../api/guests';
import type { AdminGuest, GuestInput } from '../guests/shared';
import { useUser } from './useUser';

interface Result {
  key: string;
  guests: AdminGuest[] | null;
  error: ApiError | null;
}

const byName = (a: AdminGuest, b: AdminGuest) =>
  a.last.localeCompare(b.last, undefined, { sensitivity: 'base' }) ||
  a.first.localeCompare(b.first, undefined, { sensitivity: 'base' });

/** Every guest with their RSVP, plus add / edit / remove, for the admin page. */
export function useAdminGuests() {
  const { user, password } = useUser();
  const slug = user?.slug;
  const [attempt, setAttempt] = useState(0);
  const requestKey = slug && password ? `${slug}#${attempt}` : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!slug || !password || !requestKey) return;
    let cancelled = false;
    fetchAdminGuests({ slug, password }).then(
      (guests) => {
        if (!cancelled) setResult({ key: requestKey, guests, error: null });
      },
      (error: ApiError) => {
        if (!cancelled) setResult((prev) => ({ key: requestKey, guests: prev?.guests ?? null, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, password, requestKey]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  // Saves change party membership of other guests too (joining someone on their own moves them
  // into the new party), so reload the whole list after any write rather than patching one row.
  const afterWrite = useCallback(async () => {
    if (!slug || !password || !requestKey) return;
    const guests = await fetchAdminGuests({ slug, password });
    setResult({ key: requestKey, guests, error: null });
  }, [slug, password, requestKey]);

  const create = useCallback(
    async (input: GuestInput) => {
      if (!slug || !password) throw new Error('Not signed in');
      const guest = await apiCreateGuest({ slug, password }, input);
      await afterWrite();
      return guest;
    },
    [slug, password, afterWrite],
  );

  const update = useCallback(
    async (guestSlug: string, input: GuestInput) => {
      if (!slug || !password) throw new Error('Not signed in');
      const guest = await apiUpdateGuest({ slug, password }, guestSlug, input);
      await afterWrite();
      return guest;
    },
    [slug, password, afterWrite],
  );

  const remove = useCallback(
    async (guestSlug: string) => {
      if (!slug || !password) throw new Error('Not signed in');
      await apiDeleteGuest({ slug, password }, guestSlug);
      await afterWrite();
    },
    [slug, password, afterWrite],
  );

  const guests = useMemo(() => (result?.guests ? [...result.guests].sort(byName) : null), [result]);

  return {
    guests,
    loading: requestKey !== null && result?.key !== requestKey,
    error: result?.key === requestKey ? result.error : null,
    reload,
    create,
    update,
    remove,
  };
}
