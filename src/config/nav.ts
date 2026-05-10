export type NavItem = {
  label: string;
  path: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home-v2' },
  { label: 'Schedule', path: '/home/schedule' },
  { label: 'RSVP', path: '/home/rsvp' },
  { label: 'Gift', path: '/home/gift' },
];
