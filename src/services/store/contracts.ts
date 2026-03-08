export interface DataStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  validatePassword(guestSlug: string, password: string): Promise<boolean>;
}
