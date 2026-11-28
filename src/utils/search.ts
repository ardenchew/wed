/** Lower-case, accent-free, single-spaced — so "zoe" finds "Zoë" and extra spaces don't matter. */
function normalizeName(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every word typed must appear somewhere in the guest's name or nickname. */
export function matchesSearch(
  guest: { first: string; last: string; nickname?: string },
  query: string,
): boolean {
  const words = normalizeName(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeName(`${guest.first} ${guest.last} ${guest.nickname ?? ''}`);
  return words.every((word) => haystack.includes(word));
}
