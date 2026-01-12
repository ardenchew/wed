/**
 * Guest Configuration
 * 
 * Predefined guests for the wedding
 */

import type { Guest } from '../types';

export const GUESTS: Record<string, Guest> = {
  arden_chew: {
    slug: 'arden_chew',
    first: 'Arden',
    last: 'Chew',
    party: ['emily_kwan'],
    events: ['courthouse', 'immediate_family_dinner'],
  },
  emily_kwan: {
    slug: 'emily_kwan',
    first: 'Emily',
    last: 'Kwan',
    nickname: 'Em',
    party: ['arden_chew'],
    events: ['courthouse', 'immediate_family_dinner'],
  },
};
