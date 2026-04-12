import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Polaroid } from '../components/Polaroid';
import { GUESTS } from '../config/guests';
import { useUser } from '../context/UserContext';
import Schedule from './Schedule';
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

const resolveAsset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export default function Home() {
  const { user, signOut } = useUser();
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
  const guest = user?.slug ? GUESTS[user.slug] ?? user : user;
  const displayName = guest?.nickname || guest?.first || 'Friend';

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
    navigate('/home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateDrift = useCallback(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-drift]');
    if (!els.length) return;
    const vh = window.innerHeight;
    const center = vh / 2;
    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const progress = Math.max(-1, Math.min(1, (elCenter - center) / vh));
      const dir = el.dataset.drift === 'left' ? -1 : 1;
      el.style.setProperty('--drift-x', `${progress * dir * 40}px`);
    });
  }, []);

  useEffect(() => {
    if (activePath !== '/home') return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { updateDrift(); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    updateDrift();
    return () => window.removeEventListener('scroll', onScroll);
  }, [activePath, updateDrift]);

  return (
    <main className={`home-page${activePath === '/home/schedule' ? ' home-page--schedule' : ''}`}>
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

      {activePath === '/home' ? (
        <div className="home-scroll">
          <div className="home-greeting">
            <span className="home-greeting__hi">Hi</span>
            <span className="home-greeting__name">{displayName}</span>
          </div>

          <div className="home-collage">
            <div className="home-collage__polaroid home-collage__polaroid--left" data-drift="left">
              <Polaroid dateText="9 17 2025" imagePath="/emily_arden_stony_hill.png" alt="Emily and Arden" />
            </div>
            <img
              className="home-collage__deco home-collage__deco--bridge"
              src={resolveAsset('golden_gate.png')}
              alt=""
              aria-hidden="true"
              data-drift="right"
            />
            <img
              className="home-collage__deco home-collage__deco--bottle"
              src={resolveAsset('stony_hill_clipart.png')}
              alt=""
              aria-hidden="true"
              data-drift="left"
            />
            <div className="home-collage__polaroid home-collage__polaroid--right" data-drift="right">
              <Polaroid
                dateText={guest?.polaroid2?.dateText ?? '1 29 2022'}
                imagePath={guest?.polaroid2?.imagePath ?? '/crater_lake.png'}
              />
            </div>
          </div>

          {guest?.welcomeText && (
            <div className="home-welcome">
              <p className="home-welcome__text">{guest.welcomeText}</p>
              <p className="home-welcome__signoff">Much love,</p>
              <p className="home-welcome__signoff">Emily and Arden</p>
            </div>
          )}

          <div className="home-bottom">
            <img
              className="home-bottom__deco home-bottom__deco--clipart"
              src={resolveAsset('central_park_clipart.png')}
              alt=""
              aria-hidden="true"
              data-drift="left"
            />
            <div className="home-bottom__polaroid" data-drift="right">
              <Polaroid
                dateText={guest?.polaroid3?.dateText ?? ''}
                imagePath={guest?.polaroid3?.imagePath ?? '/crater_lake_sketch.png'}
              />
            </div>
          </div>
        </div>
      ) : activePath === '/home/schedule' ? (
        <Schedule />
      ) : (
        <section className="home-page__subpage" aria-live="polite">
          <p className="home-placeholder">Placeholder: {activeLabel}</p>
        </section>
      )}
    </main>
  );
}
