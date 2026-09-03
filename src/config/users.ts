export const USER_MAPPING: Record<string, string> = {
  'Emily Kwan': 'emily_kwan',
  'Arden Chew': 'arden_chew',
  'Debbie Kwan': 'debbie_kwan',
};

export function getAllDisplayNames(): string[] {
  return Object.keys(USER_MAPPING);
}

export function getGuestSlugForDisplayName(displayName: string): string | undefined {
  return USER_MAPPING[displayName];
}
