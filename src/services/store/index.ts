import { createDevConfigStore } from './adapters/devConfig';
import type { DataStore } from './contracts';

function createStore(): DataStore {
  const adapter = import.meta.env.VITE_DATA_STORE_ADAPTER || 'dev-config';

  switch (adapter) {
    case 'dev-config':
      return createDevConfigStore();
    default:
      throw new Error(`Unsupported data store adapter: ${adapter}`);
  }
}

export const store = createStore();

export async function getStoreValue<T>(key: string): Promise<T | null> {
  return store.get<T>(key);
}

export async function setStoreValue<T>(key: string, value: T): Promise<void> {
  await store.set<T>(key, value);
}

export async function validatePassword(guestSlug: string, password: string): Promise<boolean> {
  return store.validatePassword(guestSlug, password);
}
