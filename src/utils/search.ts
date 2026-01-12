/**
 * Search Utilities
 * 
 * Functions for searching user names with fuzzy matching
 */

/**
 * Normalizes a string for search comparison
 * - Converts to lowercase
 * - Removes extra whitespace (replaces multiple spaces with single space)
 * - Trims whitespace
 */
function normalizeForSearch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Match score interface for sorting matches
 */
interface MatchScore {
  name: string;
  score: number;
  type: 'full-substring' | 'word-match' | 'partial-word';
}

/**
 * Searches for display names in the user mapping
 * Supports:
 * - Case-insensitive matching
 * - Spacing tolerance (multiple spaces treated as one)
 * - Partial matching
 * 
 * @param query - The search query
 * @param displayNames - Array of display names to search in
 * @returns Array of matching display names, ordered by likelihood:
 *   - If exact match exists, returns array with single exact match
 *   - Otherwise, returns all partial/word matches ordered by score
 */
export function searchDisplayName(
  query: string,
  displayNames: string[]
): string[] {
  if (!query.trim()) {
    return [];
  }

  const normalizedQuery = normalizeForSearch(query);
  const matches: MatchScore[] = [];
  let exactMatch: string | null = null;

  // Check all names for matches
  for (const name of displayNames) {
    const normalizedName = normalizeForSearch(name);
    
    // Check for exact match (case-insensitive, spacing-normalized)
    if (normalizedName === normalizedQuery) {
      exactMatch = name;
      break; // Exact match found, we'll return only this
    }

    // Check for full substring match (query contained in name or vice versa)
    if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
      // Prioritize matches where query is contained in name
      const score = normalizedName.includes(normalizedQuery) 
        ? 0.9 - (normalizedName.length - normalizedQuery.length) / 100 // Prefer shorter names
        : 0.7 - (normalizedQuery.length - normalizedName.length) / 100;
      matches.push({
        name,
        score,
        type: 'full-substring',
      });
      continue;
    }

    // Check for word-by-word matching
    const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
    const nameWords = normalizedName.split(' ').filter(word => word.length > 0);
    
    if (queryWords.length > 0 && nameWords.length > 0) {
      let wordMatchCount = 0;
      let partialWordMatchCount = 0;

      for (const queryWord of queryWords) {
        let matched = false;
        for (const nameWord of nameWords) {
          // Exact word match
          if (nameWord === queryWord) {
            wordMatchCount++;
            matched = true;
            break;
          }
          // Partial word match (substring)
          if (nameWord.includes(queryWord) || queryWord.includes(nameWord)) {
            partialWordMatchCount++;
            matched = true;
            break;
          }
        }
      }

      // Calculate score based on word matches
      if (wordMatchCount > 0 || partialWordMatchCount > 0) {
        const totalWords = Math.max(queryWords.length, nameWords.length);
        const exactWordScore = wordMatchCount / totalWords;
        const partialWordScore = partialWordMatchCount / totalWords * 0.6; // Partial matches weighted less
        const totalScore = exactWordScore + partialWordScore;
        
        // Only include if at least 50% of query words matched
        if (totalScore >= 0.5) {
          matches.push({
            name,
            score: totalScore,
            type: wordMatchCount > 0 ? 'word-match' : 'partial-word',
          });
        }
      }
    }
  }

  // If exact match found, return only that
  if (exactMatch) {
    return [exactMatch];
  }

  // Sort matches by score (descending), then by type priority, then by name length
  matches.sort((a, b) => {
    // First by score
    if (Math.abs(a.score - b.score) > 0.01) {
      return b.score - a.score;
    }
    // Then by type priority
    const typePriority: Record<MatchScore['type'], number> = {
      'full-substring': 3,
      'word-match': 2,
      'partial-word': 1,
    };
    if (typePriority[a.type] !== typePriority[b.type]) {
      return typePriority[b.type] - typePriority[a.type];
    }
    // Finally by name length (prefer shorter names)
    return a.name.length - b.name.length;
  });

  // Return array of matched names
  return matches.map(match => match.name);
}
