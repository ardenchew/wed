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
    nickname: 'ardy',
    welcomeText: 'Hey there handsome. You are literally getting married. How wild is that. Remember to breathe and enjoy every moment.',
    party: ['emily_kwan'],
    events: ['courthouse', 'immediate_family_dinner'],
  },
  emily_kwan: {
    slug: 'emily_kwan',
    first: 'Emily',
    last: 'Kwan',
    nickname: 'bapo',
    welcomeText: 'Hi beautiful! This is your day too. We hope you feel all the love surrounding you. You deserve the world and more.',
    party: ['arden_chew'],
    events: ['courthouse', 'immediate_family_dinner'],
  },
  debbie_kwan: {
    slug: 'debbie_kwan',
    first: 'Debbie',
    last: 'Kwan',
    nickname: 'deb',
    welcomeText: 'What up my glip glop. Debbie, you were born with a twin but now you get to have a brother as well. That seems pretty snazzy. You look like a cabbage and you smell like one too. Make sure to checkout Room 40 while you’re in sf.',
    polaroid2: { imagePath: '/debbie/debbie_2.png', dateText: '1 29 2022' },
    polaroid3: { imagePath: '/debbie/debbie_3.png', dateText: '2007' },
    party: [],
    events: ['courthouse', 'immediate_family_dinner'],
  },
};
