import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../config/nav';
import { useUser } from '../hooks/useUser';
import { resolveAsset } from '../utils/asset';

const HOME_PATH = NAV_ITEMS[0].path;

type HomeHeaderProps = {
  activePath: string;
};

/**
 * Header for /home-v2 and /home/*. The `.home-logo` and `.home-menu__trigger` class names
 * are queried by useHomeV2HeroScene to compute the hero's minimum compressed scale — keep
 * them stable.
 */
export function HomeHeader({ activePath }: HomeHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        )}
      </div>
    </header>
  );
}
