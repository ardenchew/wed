/**
 * TypeScript type definitions
 */

import type { User } from '../../schema/v1/user';

// Re-export schema types
export type { User } from '../../schema/v1/user';

// User context types
export interface UserContextType {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
}

// Redis response types
export interface RedisResponse<T = string> {
  result: T | null;
  error?: string;
}

export interface RedisError {
  error: string;
  message?: string;
}
