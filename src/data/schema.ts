export const DB_NAMESPACE = {
  USERS: 'users',
} as const;

export type DbNamespace = (typeof DB_NAMESPACE)[keyof typeof DB_NAMESPACE];
export type DbKey = `${DbNamespace}:${string}`;

export const DB_KEYS = {
  users: (guestSlug: string): DbKey => `${DB_NAMESPACE.USERS}:${guestSlug}`,
};

export interface AuthUserRecord {
  password: string;
}
