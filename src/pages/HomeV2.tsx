import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Polaroid } from '../components/Polaroid';
import { GUESTS } from '../config/guests';
import { useUser } from '../context/UserContext';
import '../styles/index.css';

type NavItem = {
  label: string;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/home-v2' },
  { label: 'Schedule', path: '/home/schedule' },
  { label: 'RSVP', path: '/home/rsvp' },
  { label: 'Gift', path: '/home/gift' },
];

const resolveAsset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

/** Scroll distance (× viewport height) before hero docks into the document and scrolls normally */
const COMPRESS_VH = 0.5;
const FADE_VH = 0.32;
/** When header metrics are missing, fall back to this end scale */
const MIN_SCALE_FALLBACK = 0.8;
/** Horizontal gap (px) between scaled hero edges and logo / menu hit targets */
const HERO_CLEAR_BUFFER_PX_DESKTOP = 12;
const HERO_CLEAR_BUFFER_PX_MOBILE = 4;
/** Viewport width (px) at or below which the tighter mobile buffer applies */
const HERO_CLEAR_BUFFER_MOBILE_MAX_W = 640;
/** Do not shrink the hero below this scale if geometry is pathological */
const MIN_SCALE_ABSOLUTE_FLOOR = 0.42;

/** Matches :root --background when CSS cannot be read yet */
const FALLBACK_PAGE_BG_RGB: [number, number, number] = [250, 250, 250];

function parseCssRgb(color: string): [number, number, number] | null {
  const m = color.trim().match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return null;
  return [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))];
}

/** Resolved solid background for an element (comma or space-separated rgb from getComputedStyle). */
function readSolidBackgroundRgb(el: HTMLElement | null): [number, number, number] | null {
  if (!el) return null;
  const raw = getComputedStyle(el).backgroundColor;
  const comma = parseCssRgb(raw);
  if (comma) return comma;
  const m = raw
    .trim()
    .match(/rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+\s*)?\)/);
  if (!m) return null;
  return [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))];
}

/**
 * End-of-compress scale so the centered hero (full-width shell × scale) clears the logo and menu.
 * With transform-origin center: left edge at W(1−s)/2, right at W(1+s)/2.
 */
function computeHeroMinScaleForHeader(main: HTMLElement | null): number {
  if (!main) return MIN_SCALE_FALLBACK;
  const logo = main.querySelector('.home-logo');
  const menuTrigger = main.querySelector('.home-menu__trigger');
  if (!logo || !menuTrigger) return MIN_SCALE_FALLBACK;

  const W = window.innerWidth;
  if (W <= 0) return MIN_SCALE_FALLBACK;

  const buf =
    W <= HERO_CLEAR_BUFFER_MOBILE_MAX_W ? HERO_CLEAR_BUFFER_PX_MOBILE : HERO_CLEAR_BUFFER_PX_DESKTOP;
  const leftBound = logo.getBoundingClientRect().right + buf;
  const rightBound = menuTrigger.getBoundingClientRect().left - buf;

  const fromLeft = 1 - (2 * leftBound) / W;
  const fromRight = (2 * rightBound) / W - 1;
  let s = Math.min(1, fromLeft, fromRight);

  if (!Number.isFinite(s)) return MIN_SCALE_FALLBACK;
  if (s < MIN_SCALE_ABSOLUTE_FLOOR) s = MIN_SCALE_ABSOLUTE_FLOOR;
  return s;
}

export default function HomeV2() {
  const { user, signOut } = useUser();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const heroShellRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const metricsRef = useRef({ compress: 1, fade: 1, S: 2, minScale: MIN_SCALE_FALLBACK });
  const reducedMotionRef = useRef(false);
  /** Fade target: same resolved color as `.home-v2__scroll` so the docked hero matches weekend details. */
  const heroFadeTargetRgbRef = useRef<[number, number, number]>(FALLBACK_PAGE_BG_RGB);

  const activePath = '/home-v2';
  const guest = user?.slug ? GUESTS[user.slug] ?? user : user;
  const weekendGreeting = guest?.welcomeGreetingText ?? 'Welcome!';
  const weekendBody =
    guest?.welcomeBodyText ??
    'We are so happy to celebrate with you. More details for the weekend are coming soon.';
  const weekendSignature = guest?.welcomeSignatureText ?? 'Much love, Emily and Arden';
  const weekendPolaroidPath = guest?.polaroid2?.imagePath ?? '/emily_arden_stony_hill.png';
  const weekendPolaroidDate = guest?.polaroid2?.dateText ?? '9 17 2025';

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
    navigate('/home-v2');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const syncMetrics = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vh = window.innerHeight;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = mq.matches;
    reducedMotionRef.current = reduced;
    const compress = reduced ? 0 : Math.max(1, Math.round(vh * COMPRESS_VH));
    const fade = reduced ? 0 : Math.max(1, Math.round(vh * FADE_VH));
    const main = mainRef.current;
    const minScale = computeHeroMinScaleForHeader(main);
    metricsRef.current = { compress, fade, S: compress + fade, minScale };
    const sink = main?.querySelector('.home-v2__scroll-sink') as HTMLElement | null;
    if (sink) sink.style.height = `${metricsRef.current.S}px`;
    if (main) {
      main.classList.toggle('home-v2--reduced-motion', reduced);
      const scrollSection = main.querySelector('.home-v2__scroll') as HTMLElement | null;
      const fromScroll = readSolidBackgroundRgb(scrollSection);
      const fromMain = readSolidBackgroundRgb(main);
      if (fromScroll) heroFadeTargetRgbRef.current = fromScroll;
      else if (fromMain) heroFadeTargetRgbRef.current = fromMain;
      else heroFadeTargetRgbRef.current = FALLBACK_PAGE_BG_RGB;
    }
  }, []);

  const applyScroll = useCallback(() => {
    const main = mainRef.current;
    const shell = heroShellRef.current;
    const wrap = imageWrapRef.current;
    if (!main || !shell || !wrap) return;

    const { compress, fade, S, minScale } = metricsRef.current;
    const y = Math.max(0, window.scrollY);
    const reduced = reducedMotionRef.current;
    main.toggleAttribute('data-home-v2-scrolled', y > 1);

    if (reduced || S <= 0) {
      shell.classList.remove('home-v2__hero-shell--fixed', 'home-v2__hero-shell--docked');
      shell.classList.add('home-v2__hero-shell--flow');
      shell.style.top = '';
      shell.style.backgroundColor = '';
      shell.style.setProperty('--home-v2-name-fade', '1');
      wrap.style.transform = '';
      main.toggleAttribute('data-home-v2-header-dark', true);
      return;
    }

    shell.classList.remove('home-v2__hero-shell--flow');

    const tCompress = Math.min(1, y / compress);
    const scale = 1 - (1 - minScale) * tCompress;
    const tFade = y <= compress ? 0 : Math.min(1, (y - compress) / fade);
    const released = y >= S - 0.5;
    /** Docked slightly before y=S; snap shell fade to 1 so bg matches `.home-v2__scroll` exactly. */
    const tFadeShell = released ? 1 : tFade;
    const [pr, pg, pb] = heroFadeTargetRgbRef.current;
    const r = Math.round(pr * tFadeShell);
    const g = Math.round(pg * tFadeShell);
    const b = Math.round(pb * tFadeShell);

    wrap.style.transform = `scale(${scale})`;
    shell.style.backgroundColor = `rgb(${r},${g},${b})`;
    shell.style.setProperty('--home-v2-name-fade', String(tFadeShell));

    if (released) {
      shell.classList.remove('home-v2__hero-shell--fixed');
      shell.classList.add('home-v2__hero-shell--docked');
      shell.style.top = `${S}px`;
    } else {
      shell.classList.add('home-v2__hero-shell--fixed');
      shell.classList.remove('home-v2__hero-shell--docked');
      shell.style.top = '';
    }

    main.toggleAttribute('data-home-v2-header-dark', tFadeShell > 0.55 || released);
  }, []);

  const onScrollOrResize = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      applyScroll();
    });
  }, [applyScroll]);

  useLayoutEffect(() => {
    syncMetrics();
    applyScroll();
  }, [syncMetrics, applyScroll]);

  useEffect(() => {
    const onReducedChange = () => {
      syncMetrics();
      applyScroll();
    };
    const handleResize = () => {
      syncMetrics();
      applyScroll();
    };
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', onReducedChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    return () => {
      mq.removeEventListener('change', onReducedChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', onScrollOrResize);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [syncMetrics, applyScroll, onScrollOrResize]);

  useEffect(() => {
    const main = mainRef.current;
    const wrap = main?.querySelector('.home-v2__fixed-header-wrap');
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      syncMetrics();
      applyScroll();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [syncMetrics, applyScroll]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const revealElements = Array.from(main.querySelectorAll<HTMLElement>('.home-v2__reveal'));
    if (!revealElements.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      revealElements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          (entry.target as HTMLElement).classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      {
        threshold: 0.24,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={mainRef} className="home-page home-v2">
      <div className="home-v2__scroll-sink" aria-hidden="true" />
      <div ref={heroShellRef} className="home-v2__hero-shell home-v2__hero-shell--fixed">
        <div ref={imageWrapRef} className="home-v2__hero-image-wrap">
          <img
            className="home-v2__hero-img"
            src={resolveAsset('crater_lake.png')}
            alt=""
            decoding="async"
          />
        </div>
        <div className="home-v2__hero-scroll-hint" aria-hidden="true" />
        <div className="home-v2__hero-name">
          <div className="home-v2__hero-title-stack">
            <p className="landing-auth-title home-v2__guest-name">Emily & Arden</p>
            <p className="home-v2__guest-year">2027</p>
          </div>
        </div>
      </div>
      <div className="home-v2__hero-placeholder" aria-hidden="true" />

      <div className="home-v2__mount-scope">
        <div className="home-v2__fixed-header-wrap">
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
                aria-controls="home-v2-menu-panel"
                onClick={() => setIsMenuOpen((o) => !o)}
              >
                <span className="home-menu__line" />
                <span className="home-menu__line" />
                <span className="home-menu__line" />
              </button>

              {isMenuOpen && (
                <div id="home-v2-menu-panel" className="home-menu__panel" role="menu" aria-label="User menu">
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
        </div>

        <div className="home-v2__scroll-track">
          <section className="home-v2__scroll" aria-label="Weekend details">
            <div className="home-v2__scroll-inner">
              <div className="home-v2__weekend-content">
                <div className="home-v2__weekend-text">
                  <p className="home-v2__weekend-greeting home-v2__reveal">{weekendGreeting}</p>
                  <p className="home-v2__weekend-body home-v2__reveal home-v2__reveal--step-1">
                    {weekendBody}
                  </p>
                  <p className="home-v2__weekend-signature home-v2__reveal home-v2__reveal--step-2">
                    {weekendSignature}
                  </p>
                </div>
                <div className="home-v2__weekend-image-wrap home-v2__reveal home-v2__reveal--step-3">
                  <Polaroid
                    className="home-v2__weekend-polaroid"
                    dateText={weekendPolaroidDate}
                    imagePath={weekendPolaroidPath}
                    alt="Emily and Arden"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
