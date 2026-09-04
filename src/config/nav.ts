export type NavItem = {
  label: string;
  path: string;
  scrollTargetId?: string;
};

/** Id of the homepage's intro/welcome blurb section — shared with the hero scroll cue. */
export const HOME_WELCOME_SECTION_ID = 'home-welcome';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home' },
  { label: 'Welcome', path: '/home', scrollTargetId: HOME_WELCOME_SECTION_ID },
  { label: 'Schedule', path: '/schedule' },
  { label: 'RSVP', path: '/rsvp' },
  { label: 'Gift', path: '/gift' },
];
