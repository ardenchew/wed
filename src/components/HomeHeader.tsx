import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../config/nav';
import { useUser } from '../hooks/useUser';
import { resolveAsset } from '../utils/asset';
import { scrollToId } from '../utils/scrollToId';

const HOME_PATH = NAV_ITEMS[0].path;

type HomeHeaderProps = {
  activePath: string;
  /** Id of the in-page section currently scrolled to, if any (e.g. the homepage's welcome blurb). */
  activeSectionId?: string;
};

/**
 * Header for /home and sibling routes (/schedule, /rsvp, /gift). The `.home-logo` and
 * `.home-menu__trigger` class names are queried by useHomeHeroScene to compute the hero's
 * minimum compressed scale — keep them stable.
 */
export function HomeHeader({ activePath, activeSectionId }: HomeHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useUser();
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
            </div>
            <div className="home-menu__divider" aria-hidden="true" />
            <button type="button" className="home-menu__action" role="menuitem" onClick={signOut}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
