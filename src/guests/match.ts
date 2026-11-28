/**
 * Sign-in name matching, used by the API's `POST /guests/lookup`. Pure and dependency-free so the
 * site, the Worker and a quick script can all run it.
 *
 * The rule is strict on purpose, so the lookup can't be used to list the guest list:
 * - every typed word must start a different word of the guest's first, last or nickname
 *   (order doesn't matter: "kwan em" finds Emily Kwan);
 * - at least one typed word must be a whole word of those names, 2+ letters ("Kwan", "emily k");
 * - an exact full name ("emily kwan", "kwan emily", or nickname + last) returns only that guest;
 * - at most `MATCH_LIMIT` guests come back.
 * If nothing matches, one typo (a wrong, missing, extra or swapped letter) is forgiven in whole
 * words of 5+ letters, so "Emilly Kwan" still finds Emily Kwan but "Kwan" must be spelled right.
 */

export const MATCH_LIMIT = 5;
/** Longest query the lookup accepts. */
export const MATCH_QUERY_MAX = 120;
const MIN_WHOLE_WORD = 2;
const MIN_TYPO_WORD = 5;

export interface MatchableGuest {
  first: string;
  last: string;
  nickname?: string | null;
}

/** `  Zoë  O'Neil-Smith ` → `["zoe", "oneil", "smith"]`: no case, accents or punctuation. */
export function nameWords(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** True when `a` and `b` are one edit apart (substitution, insertion, deletion or swap). */
function oneEditApart(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) {
    const swapped = a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
    return swapped || a.slice(i + 1) === b.slice(i + 1);
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.slice(i) === longer.slice(i + 1);
}

type WordMatch = 'whole' | 'typo' | 'prefix';

function wordMatch(typed: string, word: string, allowTypos: boolean): WordMatch | null {
  if (typed === word) return 'whole';
  if (word.startsWith(typed)) return 'prefix';
  if (allowTypos && typed.length >= MIN_TYPO_WORD && word.length >= MIN_TYPO_WORD && oneEditApart(typed, word)) {
    return 'typo';
  }
  return null;
}

/**
 * Pairs each typed word with a different name word, preferring the pairing with the most
 * whole-word matches. Null when some typed word can't be placed; `anchored` says whether a typed
 * word of 2+ letters matched a whole word (or, with typos allowed, nearly did).
 */
function bestAssignment(
  typed: string[],
  words: string[],
  allowTypos: boolean,
): { whole: number; anchored: boolean } | null {
  let best: { whole: number; anchored: boolean } | null = null;
  const used = new Array<boolean>(words.length).fill(false);

  const visit = (index: number, whole: number, anchored: boolean) => {
    if (index === typed.length) {
      if (!best || whole > best.whole) best = { whole, anchored };
      return;
    }
    for (let w = 0; w < words.length; w++) {
      if (used[w]) continue;
      const kind = wordMatch(typed[index], words[w], allowTypos);
      if (!kind) continue;
      const anchors = kind !== 'prefix' && typed[index].length >= MIN_WHOLE_WORD;
      used[w] = true;
      visit(index + 1, whole + (kind === 'whole' ? 1 : 0), anchored || anchors);
      used[w] = false;
    }
  };
  visit(0, 0, false);
  return best;
}

function sameWords(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ');
}

/** The guests a typed name could mean, best first; empty when it's too vague to say. */
export function matchGuests<G extends MatchableGuest>(query: string, guests: readonly G[]): G[] {
  const typed = nameWords(query.slice(0, MATCH_QUERY_MAX));
  if (typed.length === 0 || typed.length > 6) return [];

  const prepared = guests.map((guest) => {
    const first = nameWords(guest.first);
    const last = nameWords(guest.last);
    const nickname = nameWords(guest.nickname ?? '');
    return { guest, first, last, nickname, words: [...first, ...last, ...nickname] };
  });

  const exact = prepared.filter(
    ({ first, last, nickname }) =>
      sameWords(typed, [...first, ...last]) || (nickname.length > 0 && sameWords(typed, [...nickname, ...last])),
  );
  if (exact.length > 0) return exact.slice(0, MATCH_LIMIT).map(({ guest }) => guest);

  for (const allowTypos of [false, true]) {
    const scored: { guest: G; whole: number; name: string }[] = [];
    for (const { guest, words } of prepared) {
      const result = bestAssignment(typed, words, allowTypos);
      if (result?.anchored) scored.push({ guest, whole: result.whole, name: `${guest.first} ${guest.last}` });
    }
    if (scored.length > 0) {
      scored.sort((a, b) => b.whole - a.whole || a.name.localeCompare(b.name));
      return scored.slice(0, MATCH_LIMIT).map(({ guest }) => guest);
    }
  }
  return [];
}
