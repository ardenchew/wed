/**
 * Upstash Redis Service Client
 * 
 * Provides functions to interact with Upstash Redis via REST API
 */

import { Redis } from '@upstash/redis';

const UPSTASH_REDIS_REST_URL = import.meta.env.VITE_UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN || '';

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.warn('Upstash Redis credentials are not set. Redis operations will fail.');
}

// Initialize Upstash Redis client
const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Validates a user's password
 * 
 * @param userKey - The user key (e.g., "emily_kwan")
 * @param password - The password to validate
 * @returns Promise with true if password matches, false otherwise
 */
export async function validatePassword(userKey: string, password: string): Promise<boolean> {
  try {
    const redisKey = `password:${userKey}`;
    const storedPassword = await redis.get(redisKey);
    
    if (!storedPassword) {
      return false;
    }
    
    // Compare passwords (storedPassword may be a string or null)
    return storedPassword === password;
  } catch (error) {
    console.error('Redis password validation failed:', {
      userKey,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}
