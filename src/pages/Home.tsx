/**
 * Home Page
 *
 * Figma-aligned authenticated homepage with a top navigation and user menu.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Polaroid } from '../components/Polaroid';
import { useUser } from '../context/UserContext';
import '../styles/index.css';

type NavItem = {
  label: string;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home' },
  { label: 'Schedule', path: '/home/schedule' },
  { label: 'RSVP', path: '/home/rsvp' },
  { label: 'Gift', path: '/home/gift' },
];

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export default function Home() {
  const { signOut } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const normalizedPath = normalizePath(location.pathname);
  const validPaths = useMemo(() => new Set(NAV_ITEMS.map((item) => item.path)), []);

  useEffect(() => {
    if (!validPaths.has(normalizedPath)) {
      navigate('/home', { replace: true });
    }
  }, [navigate, normalizedPath, validPaths]);

  const activePath = validPaths.has(normalizedPath) ? normalizedPath : '/home';
  const activeLabel = NAV_ITEMS.find((item) => item.path === activePath)?.label ?? 'Home';

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <main className="home-page">
      <div className="home-page__background" aria-hidden="true" />
      <div className="home-page__overlay" aria-hidden="true" />

      <div className="home-menu" ref={menuRef}>
        <button
          type="button"
          className="home-menu__trigger"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          aria-controls="home-menu-panel"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className="home-menu__line" />
          <span className="home-menu__line" />
          <span className="home-menu__line" />
        </button>

        {isMenuOpen ? (
          <div id="home-menu-panel" className="home-menu__panel" role="menu" aria-label="User menu">
            <div className="home-menu__section">
              {NAV_ITEMS.map((item) => {
                const isActive = activePath === item.path;
                return (
                  <button
                    key={`menu-${item.path}`}
                    type="button"
                    className={`home-menu__action${isActive ? ' home-menu__action--active' : ''}`}
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(item.path);
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="home-menu__divider" aria-hidden="true" />

            <button type="button" className="home-menu__action" role="menuitem" onClick={signOut}>
              Sign Out
            </button>
          </div>
        ) : null}
      </div>

      <section className="home-page__content" aria-live="polite">
        {activePath === '/home' ? (
          <Polaroid dateText="9 17 2025" imagePath="/emily_arden_stony_hill.png" alt="Emily and Arden" />
        ) : (
          <p className="home-placeholder">Placeholder: {activeLabel}</p>
        )}
      </section>
    </main>
  );
}
