import type { Guest } from '../types';

export const GUESTS: Record<string, Guest> = {
  arden_chew: {
    slug: 'arden_chew',
    first: 'Arden',
    last: 'Chew',
    nickname: 'ardy',
    welcomeGreetingText: 'Lorum Ipsum',
    welcomeBodyText: 'ksaldjf;aklsdjf klsjdfkl sdjf lksdj fklsdj fkdlsj fklsdj fslkdj flksdj fklsj kfsdjklf jsdlkj fskdkf js',
    welcomeSignatureText: '-arden',
    party: ['emily_kwan'],
    events: ['courthouse', 'immediate_family_dinner'],
  },
  emily_kwan: {
    slug: 'emily_kwan',
    first: 'Emily',
    last: 'Kwan',
    nickname: 'bapo',
    welcomeGreetingText: 'Hi Bapo!',
    welcomeBodyText: 'Mallo',
    welcomeSignatureText: 'Much love, Bapo',
    party: ['arden_chew'],
    events: ['courthouse', 'immediate_family_dinner'],
  },
  debbie_kwan: {
    slug: 'debbie_kwan',
    first: 'Debbie',
    last: 'Kwan',
    nickname: 'deb',
    welcomeGreetingText: 'Hi Debbie!',
    welcomeBodyText: 'What up my glip glop. Debbie, you were born with a twin but now you get to have a brother as well. That seems pretty snazzy. You look like a cabbage and you smell like one too. Make sure to checkout Room 40 while you’re in sf.',
    welcomeSignatureText: 'Much love, Emily and Arden',
    polaroids: [
      { publicId: 'wed/guests/debbie_kwan/1', dateText: '1 29 2022' },
      { publicId: 'wed/guests/debbie_kwan/2', dateText: '2007' },
    ],
    party: [],
    events: ['courthouse', 'immediate_family_dinner'],
  },
};
