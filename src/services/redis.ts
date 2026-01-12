/**
 * Upstash Redis Service Client
 * 
 * Provides functions to interact with Upstash Redis via REST API
 */

import { Redis } from '@upstash/redis';
import type { User } from '../../schema/v1/user';
import { createUserKey, normalizeFullName, validateFullName } from '../../schema/v1/user';

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
 * Gets a value from Redis by key
 * 
 * @param key - Redis key
 * @returns Promise with the value or null if not found
 */
async function get(key: string): Promise<string | null> {
  try {
    const result = await redis.get(key);
    return result as string | null;
  } catch (error) {
    console.error('Redis GET failed:', error);
    return null;
  }
}

/**
 * Sets a value in Redis
 * 
 * @param key - Redis key
 * @param value - Value to set
 * @returns Promise indicating success
 */
async function set(key: string, value: string): Promise<boolean> {
  try {
    await redis.set(key, value);
    return true;
  } catch (error) {
    console.error('Redis SET failed:', error);
    return false;
  }
}

/**
 * Finds a user by their full name
 * 
 * @param fullName - The full name to search for
 * @returns Promise with User object if found, null otherwise
 */
export async function findUserByFullName(fullName: string): Promise<User | null> {
  if (!validateFullName(fullName)) {
    return null;
  }

  const normalized = normalizeFullName(fullName);
  const key = createUserKey(fullName);
  const storedName = await get(key);

  if (!storedName) {
    return null;
  }

  return {
    normalizedName: normalized,
    fullName: storedName,
  };
}

/**
 * Gets a user by their normalized name
 * 
 * @param normalizedName - The normalized name
 * @returns Promise with User object if found, null otherwise
 */
export async function getUser(normalizedName: string): Promise<User | null> {
  const key = `user:${normalizedName}`;
  const fullName = await get(key);

  if (!fullName) {
    return null;
  }

  return {
    normalizedName,
    fullName,
  };
}

/**
 * Creates or updates a user
 * 
 * @param fullName - The user's full name
 * @returns Promise with User object if successful, null otherwise
 */
export async function setUser(fullName: string): Promise<User | null> {
  if (!validateFullName(fullName)) {
    return null;
  }

  const normalized = normalizeFullName(fullName);
  const key = createUserKey(fullName);
  const success = await set(key, fullName);

  if (!success) {
    return null;
  }

  return {
    normalizedName: normalized,
    fullName,
  };
}

/**
 * Gets a user's password from Redis
 * 
 * @param redisKey - The Redis key for the user (e.g., "emily_kwan")
 * @returns Promise with the password or null if not found
 */
export async function getUserPassword(redisKey: string): Promise<string | null> {
  const passwordKey = `user:${redisKey}:password`;
  return await get(passwordKey);
}

/**
 * Validates a user's password
 * 
 * @param redisKey - The Redis key for the user
 * @param password - The password to validate
 * @returns Promise with true if password matches, false otherwise
 */
export async function validatePassword(redisKey: string, password: string): Promise<boolean> {
  const storedPassword = await getUserPassword(redisKey);
  return storedPassword === password;
}
