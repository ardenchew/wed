/**
 * Redis Cloud Service Client
 * 
 * Provides functions to interact with Redis Cloud via REST API
 */

import type { User } from '../../schema/v1/user';
import { createUserKey, normalizeFullName, validateFullName } from '../../schema/v1/user';
import type { RedisResponse } from '../types';

const REDIS_ENDPOINT = import.meta.env.VITE_REDIS_ENDPOINT || '';
const REDIS_AUTH_TOKEN = import.meta.env.VITE_REDIS_AUTH_TOKEN || '';

if (!REDIS_ENDPOINT) {
  console.warn('VITE_REDIS_ENDPOINT is not set. Redis operations will fail.');
}

/**
 * Makes a request to the Redis Cloud REST API
 * 
 * @param command - Redis command to execute
 * @param args - Arguments for the command
 * @returns Promise with Redis response
 */
async function redisRequest<T = string>(
  command: string,
  ...args: string[]
): Promise<RedisResponse<T>> {
  try {
    const url = `${REDIS_ENDPOINT}/${command}`;
    const body = args.length > 0 ? JSON.stringify({ args }) : undefined;

    const response = await fetch(url, {
      method: args.length > 0 ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(REDIS_AUTH_TOKEN && { Authorization: `Bearer ${REDIS_AUTH_TOKEN}` }),
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Redis API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Redis request failed:', error);
    return {
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets a value from Redis by key
 * 
 * @param key - Redis key
 * @returns Promise with the value or null if not found
 */
async function get(key: string): Promise<string | null> {
  const response = await redisRequest<string>(`GET/${encodeURIComponent(key)}`);
  return response.result;
}

/**
 * Sets a value in Redis
 * 
 * @param key - Redis key
 * @param value - Value to set
 * @returns Promise indicating success
 */
async function set(key: string, value: string): Promise<boolean> {
  const response = await redisRequest(`SET`, key, value);
  return response.result !== null && !response.error;
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
