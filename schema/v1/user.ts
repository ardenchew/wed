/**
 * User Schema v1
 * 
 * Key structure: user:{normalized-full-name}
 * Value structure: full name (string) with original capitalization
 * 
 * Example:
 *   Key: user:john doe
 *   Value: "John Doe"
 */

export const SCHEMA_VERSION = 'v1';

export interface User {
  normalizedName: string;
  fullName: string;
}

/**
 * Normalizes a full name for use as a Redis key
 * - Converts to lowercase
 * - Trims whitespace
 * - Preserves spaces between words
 * 
 * @param fullName - The full name to normalize
 * @returns Normalized name suitable for Redis key
 */
export function normalizeFullName(fullName: string): string {
  return fullName.trim().toLowerCase();
}

/**
 * Creates a Redis key for a user given their full name
 * 
 * @param fullName - The full name to create a key for
 * @returns Redis key in format: user:{normalized-name}
 */
export function createUserKey(fullName: string): string {
  const normalized = normalizeFullName(fullName);
  return `user:${normalized}`;
}

/**
 * Parses a Redis key to extract the normalized name
 * 
 * @param key - Redis key in format: user:{normalized-name}
 * @returns Normalized name or null if key format is invalid
 */
export function parseUserKey(key: string): string | null {
  const prefix = 'user:';
  if (!key.startsWith(prefix)) {
    return null;
  }
  return key.slice(prefix.length);
}

/**
 * Validates a full name
 * 
 * @param fullName - The full name to validate
 * @returns true if valid, false otherwise
 */
export function validateFullName(fullName: string): boolean {
  return typeof fullName === 'string' && fullName.trim().length > 0;
}
