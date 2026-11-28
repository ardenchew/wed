export type NavItem = {
  label: string;
  path: string;
  scrollTargetId?: string;
};

/** Id of the homepage's intro/welcome blurb section — shared with the hero scroll cue. */
export const HOME_WELCOME_SECTION_ID = 'home-welcome';

/** Guest management for Emily and Arden; shown in the menu only to admins. */
export const ADMIN_PATH = '/admin';

/** The gifts page and the registry it links to. */
export const GIFTS_PATH = '/gifts';
export const REGISTRY_URL = 'https://registry.theknot.com/arden-chew-january-2028-ca/81636010';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home' },
  { label: 'Welcome', path: '/home', scrollTargetId: HOME_WELCOME_SECTION_ID },
  { label: 'Schedule', path: '/schedule' },
  { label: 'Gift', path: GIFTS_PATH },
];
