export type SectionNavItem = { kind: 'section'; id: string; label: string };
export type RouteNavItem = { kind: 'route'; to: string; label: string; end?: boolean };
export type NavItem = SectionNavItem | RouteNavItem;

/** Inline links in the desktop header. Everything else lives in the menu drawer. */
export const PRIMARY_NAV: NavItem[] = [
  { kind: 'section', id: 'gallery', label: 'Gallery' },
  { kind: 'section', id: 'about', label: 'About' },
  { kind: 'section', id: 'reviews', label: 'Reviews' },
  { kind: 'section', id: 'forums', label: 'Forums' },
  { kind: 'section', id: 'pricing', label: 'Pricing' },
  { kind: 'section', id: 'contact', label: 'Contact' },
];

/** Grouped navigation used by the mobile drawer and the footer. */
export const MENU_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Explore',
    items: [
      { kind: 'section', id: 'top', label: 'Home' },
      { kind: 'section', id: 'gallery', label: 'Gallery' },
      { kind: 'section', id: 'about', label: 'About' },
      { kind: 'section', id: 'reviews', label: 'Reviews' },
      { kind: 'section', id: 'forums', label: 'Forums' },
      { kind: 'section', id: 'music', label: 'Music' },
    ],
  },
  {
    title: 'Book',
    items: [
      { kind: 'section', id: 'pricing', label: 'Pricing' },
      { kind: 'section', id: 'contact', label: 'Contact' },
      { kind: 'route', to: '/schedule', label: 'Schedule' },
    ],
  },
  {
    title: 'More',
    items: [
      { kind: 'route', to: '/discography', label: 'Discography' },
      { kind: 'route', to: '/reels', label: 'Reels' },
      { kind: 'route', to: '/game', label: 'Game' },
      { kind: 'route', to: '/tickets', label: 'Tickets' },
      { kind: 'route', to: '/account', label: 'Account' },
    ],
  },
];

export function sectionHref(id: string) {
  return id === 'top' ? '/' : `/#${id}`;
}

export function isSectionActive(id: string, pathname: string, hash: string) {
  if (pathname !== '/') return false;
  if (id === 'top') return !hash || hash === '#top';
  return hash === `#${id}`;
}

/** Smooth-scroll to a section on the one-page home without leaving the route. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', sectionHref(id));
}
