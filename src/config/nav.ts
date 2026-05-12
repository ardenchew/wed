export type NavItem = {
  label: string;
  path: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home' },
  { label: 'Schedule', path: '/schedule' },
  { label: 'RSVP', path: '/rsvp' },
  { label: 'Gift', path: '/gift' },
];
