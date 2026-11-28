import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ADMIN_PATH, NAV_ITEMS } from '../config/nav';
import { SCHEDULE_PATH, useOpenRsvp } from '../hooks/useOpenRsvp';
import { useRsvp } from '../hooks/useRsvp';
import { useUser } from '../hooks/useUser';
import { rsvpStatus } from '../rsvp/shared';
import { resolveAsset } from '../utils/asset';
import { scrollToId } from '../utils/scrollToId';

const HOME_PATH = NAV_ITEMS[0].path;

type HomeHeaderProps = {
  activePath: string;
  /** Id of the in-page section currently scrolled to, if any (e.g. the homepage's welcome blurb). */
  activeSectionId?: string;
  /** Replaces the logo's usual "go to Home" (Home uses it to reseal its envelope). */
  onLogoClick?: () => void;
};

/**
 * Header for /home and its sibling routes. The `.home-logo` and
 * `.home-menu__trigger` class names are queried by useHomeHeroScene to compute the hero's
 * minimum compressed scale — keep them stable.
 */
export function HomeHeader({ activePath, activeSectionId, onLogoClick }: HomeHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useUser();
  const openRsvp = useOpenRsvp();
  const { myRsvp } = useRsvp();
  /** Offer RSVP in the menu only until the guest has answered (still shown while it loads). */
  const showRsvp = !myRsvp || rsvpStatus(myRsvp) === 'pending';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipCloseScrollRef = useRef(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (skipCloseScrollRef.current) {
        skipCloseScrollRef.current = false;
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
      return;
    }
    navigate(HOME_PATH);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="home-header">
      <button type="button" className="home-logo" onClick={handleLogoClick} aria-label="Go home">
        <img src={resolveAsset('logo.svg')} alt="E & A" className="home-logo__img" />
      </button>

      <div className="home-menu" ref={menuRef}>
        <button
          type="button"
          className="home-menu__trigger"
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          aria-controls="home-menu-panel"
          onClick={() => setIsMenuOpen((o) => !o)}
        >
          <span className="home-menu__line" />
          <span className="home-menu__line" />
          <span className="home-menu__line" />
        </button>

        {isMenuOpen && (
          <div id="home-menu-panel" className="home-menu__panel" role="menu" aria-label="User menu">
            {showRsvp && (
              <>
                <button
                  type="button"
                  className="home-menu__action home-menu__action--icon"
                  role="menuitem"
                  onClick={() => {
                    // Already on Schedule: keep the scroll position; the modal opens over it.
                    if (activePath === SCHEDULE_PATH) skipCloseScrollRef.current = true;
                    setIsMenuOpen(false);
                    openRsvp();
                  }}
                >
                  <svg
                    className="home-menu__icon"
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="2" y="3.5" width="12" height="9" rx="1" />
                    <path d="m2.5 4.5 5.5 4 5.5-4" />
                  </svg>
                  RSVP
                </button>
                <div className="home-menu__divider" aria-hidden="true" />
              </>
            )}
            <div className="home-menu__section">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  activePath === item.path &&
                  (item.scrollTargetId ? activeSectionId === item.scrollTargetId : !activeSectionId);
                return (
                  <button
                    key={`menu-${item.label}`}
                    type="button"
                    className={`home-menu__action${isActive ? ' home-menu__action--active' : ''}`}
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (item.scrollTargetId && activePath === item.path) {
                        skipCloseScrollRef.current = true;
                        scrollToId(item.scrollTargetId);
                      } else if (item.scrollTargetId) {
                        navigate(item.path, { state: { scrollTargetId: item.scrollTargetId } });
                      } else {
                        navigate(item.path);
                      }
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
              {user?.isAdmin && (
                <button
                  type="button"
                  className={`home-menu__action${activePath === ADMIN_PATH ? ' home-menu__action--active' : ''}`}
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(ADMIN_PATH);
                  }}
                >
                  Admin
                </button>
              )}
            </div>
            <div className="home-menu__divider" aria-hidden="true" />
            <button
              type="button"
              className="home-menu__action home-menu__action--icon"
              role="menuitem"
              onClick={signOut}
            >
              <svg
                className="home-menu__icon"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6" />
                <path d="M10.5 5 13.5 8l-3 3" />
                <path d="M13.5 8H6.5" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
