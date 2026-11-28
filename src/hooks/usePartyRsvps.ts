import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPartyRsvps, savePartyRsvps, type RsvpApiError } from '../rsvp/api';
import type { PartyRsvpResponse, RsvpUpdateRequest } from '../rsvp/shared';
import { useUser } from './useUser';

export interface PartyRsvpsState {
  data: PartyRsvpResponse | null;
  loading: boolean;
  /** Error from the last load (not from saves — `save` rejects with those instead). */
  loadError: RsvpApiError | null;
  reload: () => void;
  /** Saves and, on success, replaces `data` with the server's updated party. */
  save: (update: RsvpUpdateRequest) => Promise<PartyRsvpResponse>;
}

interface Result {
  /** Which request this answers; `loading` is true until it matches the current one. */
  key: string;
  data: PartyRsvpResponse | null;
  error: RsvpApiError | null;
}

/** The signed-in guest's party and everyone's RSVP answers, from the RSVP API. */
export function usePartyRsvps(): PartyRsvpsState {
  const { user, password } = useUser();
  const slug = user?.slug;
  const [attempt, setAttempt] = useState(0);
  const requestKey = slug && password ? `${slug}#${attempt}` : null;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!slug || !password || !requestKey) return;
    let cancelled = false;
    fetchPartyRsvps({ slug, password }).then(
      (data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      },
      (error: RsvpApiError) => {
        // Keep showing the last good data if a reload fails.
        if (!cancelled) setResult((prev) => ({ key: requestKey, data: prev?.data ?? null, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, password, requestKey]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const save = useCallback(
    async (update: RsvpUpdateRequest) => {
      if (!slug || !password || !requestKey) throw new Error('Not signed in');
      const data = await savePartyRsvps({ slug, password }, update);
      setResult({ key: requestKey, data, error: null });
      return data;
    },
    [slug, password, requestKey],
  );

  // A result for another guest (after switching accounts) must never be shown.
  const data = result && result.data?.self === slug ? result.data : null;
  const loading = requestKey !== null && result?.key !== requestKey;
  const loadError = result?.key === requestKey ? result.error : null;
  return useMemo(
    () => ({ data, loading, loadError, reload, save }),
    [data, loading, loadError, reload, save],
  );
}
