import { USER_PASSWORDS } from '../../../../config/authUsers';
import { DB_KEYS } from '../../../../data/schema';
import type { AuthUserRecord } from '../../../../data/schema';
import type { DataStore } from '../../contracts';

export function createDevConfigStore(): DataStore {
  const baseStore = new Map<string, unknown>();
  const overlay = new Map<string, unknown>();

  Object.entries(USER_PASSWORDS).forEach(([guestSlug, password]) => {
    baseStore.set(DB_KEYS.users(guestSlug), { password });
  });

  return {
    async get<T>(key: string): Promise<T | null> {
      if (overlay.has(key)) {
        return overlay.get(key) as T;
      }

      if (baseStore.has(key)) {
        return baseStore.get(key) as T;
      }

      return null;
    },

    async set<T>(key: string, value: T): Promise<void> {
      overlay.set(key, value);
    },

    async validatePassword(guestSlug: string, password: string): Promise<boolean> {
      const authRecord = await this.get<AuthUserRecord>(DB_KEYS.users(guestSlug));
      return authRecord?.password === password;
    },
  };
}
