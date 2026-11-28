export type NavItem = {
  label: string;
  path: string;
  scrollTargetId?: string;
};

/** Id of Home V2's welcome section — shared with its hero scroll cue and the menu. */
export const HOME_WELCOME_SECTION_ID = 'home-welcome';

/** Where guests land after signing in: the envelope Home. */
export const HOME_PATH = '/home';

/** The previous Home (photo hero and marquee), kept to compare against the envelope Home. */
export const HOME_V2_PATH = '/home-v2';

/** Guest management for Emily and Arden; shown in the menu only to admins. */
export const ADMIN_PATH = '/admin';

/** The gifts page and the registry it links to. */
export const GIFTS_PATH = '/gifts';
export const REGISTRY_URL = 'https://registry.theknot.com/arden-chew-january-2028-ca/81636010';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: HOME_PATH },
  { label: 'Home V2', path: HOME_V2_PATH },
  // The welcome section is on Home V2's page (the envelope Home has no sections to jump to).
  { label: 'Welcome', path: HOME_V2_PATH, scrollTargetId: HOME_WELCOME_SECTION_ID },
  { label: 'Schedule', path: '/schedule' },
  { label: 'Gift', path: GIFTS_PATH },
];
