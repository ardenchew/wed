/**
 * User Mapping Configuration
 * 
 * Maps display names to Redis keys for user lookup
 */

export const USER_MAPPING: Record<string, string> = {
  'Emily Kwan': 'emily_kwan',
  'Arden Chew': 'arden_chew',
};

/**
 * Get all display names from the mapping
 */
export function getAllDisplayNames(): string[] {
  return Object.keys(USER_MAPPING);
}

/**
 * Get Redis key for a display name
 */
export function getRedisKeyForDisplayName(displayName: string): string | undefined {
  return USER_MAPPING[displayName];
}
