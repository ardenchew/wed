import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { HeroImage } from '../components/HeroImage';
import { HomeHeader } from '../components/HomeHeader';
import { Polaroid } from '../components/Polaroid';
import { RsvpStatusButton } from '../components/RsvpStatusButton';
import {
  DEFAULT_WEEKEND_POLAROID_DATE,
  DEFAULT_WEEKEND_POLAROID_PUBLIC_ID,
  HOME_GALLERY_PUBLIC_IDS,
} from '../config/homePhotos';
import { HOME_WELCOME_SECTION_ID } from '../config/nav';
import { WELCOME_DEFAULTS } from '../guests/shared';
import { useGuest } from '../hooks/useGuest';
import { useHomeHeroScene } from '../hooks/useHomeHeroScene';
import { cloudinaryUrl, cloudinarySrcSet } from '../utils/cloudinary';
import { scrollToId } from '../utils/scrollToId';

/** Scroll positions below this (× viewport height) are close enough to the hero to snap back up */
const SNAP_THRESHOLD_VH = 0.7;
/** Idle time after the last scroll event before a stalled upward gesture is snapped to the top */
const SNAP_IDLE_MS = 300;
/** How long a visitor can sit on the hero before the "Scroll" cue fades in to nudge them. */
const SCROLL_HINT_DELAY_MS = 5000;


/**
 * Gallery tiles crop with `object-fit: cover`, so a 3:2 landscape photo has to be wider than the
 * tile to fill its height. Phones: tiles are 60vh tall → 1.5 × 60vh = 90vh. Above 640px: tiles
 * are 3:4 at 23.5vw wide → 2 × 23.5vw = 47vw. See `.home__gallery-item`.
 */
const GALLERY_SIZES = '(max-width: 640px) 90vh, 47vw';

export default function Home() {
  const guest = useGuest();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrollHintVisible, setScrollHintVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);
  const mainRef = useRef<HTMLElement>(null);
  const heroShellRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLElement>(null);
  const galleryPinRef = useRef<HTMLDivElement>(null);

  useHomeHeroScene({
    mainRef,
    heroShellRef,
    imageWrapRef,
    gallerySectionRef,
    galleryPinRef,
  });

  const weekendGreeting = guest?.welcomeGreetingText ?? WELCOME_DEFAULTS.greeting;
  const weekendBody = guest?.welcomeBodyText ?? WELCOME_DEFAULTS.body;
  const weekendSignature = guest?.welcomeSignatureText ?? WELCOME_DEFAULTS.signature;
  const guestWeekendPolaroid = guest?.polaroids?.[0];
  const weekendPolaroidPublicId = guestWeekendPolaroid?.publicId ?? DEFAULT_WEEKEND_POLAROID_PUBLIC_ID;
  const weekendPolaroidDate = guestWeekendPolaroid?.dateText ?? DEFAULT_WEEKEND_POLAROID_DATE;
  const hasGuestWeekendPolaroid = Boolean(guestWeekendPolaroid);

  const guestGalleryPublicIds = useMemo(
    () => guest?.polaroids?.slice(1).map((p) => p.publicId) ?? [],
    [guest?.polaroids],
  );

  const galleryPublicIds = useMemo(() => {
    const ordered = [
      // When the guest has their own weekend polaroid, also surface the default hero in the gallery.
      ...(hasGuestWeekendPolaroid ? [DEFAULT_WEEKEND_POLAROID_PUBLIC_ID] : []),
      ...HOME_GALLERY_PUBLIC_IDS,
      ...guestGalleryPublicIds,
    ];
    const seen = new Set<string>();
    return ordered.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [guestGalleryPublicIds, hasGuestWeekendPolaroid]);

  const galleryLoopPublicIds = useMemo(
    () => [...galleryPublicIds, ...galleryPublicIds],
    [galleryPublicIds],
  );

  /**
   * Rescues an upward gesture that stalls partway back up the hero. Scrolling *down* into the
   * band — or resting there on purpose — is left alone, and nothing fires while a finger is
   * still on the screen, so a paused drag is never yanked out from under the user.
   */
  useEffect(() => {
    let snapTimeout: number | null = null;
    let lastScrollY = window.scrollY;
    let scrollingUp = false;
    let touchActive = false;

    const clearSnap = () => {
      if (snapTimeout != null) {
        window.clearTimeout(snapTimeout);
        snapTimeout = null;
      }
    };

    const armSnap = () => {
      clearSnap();
      snapTimeout = window.setTimeout(() => {
        snapTimeout = null;
        if (touchActive) return;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, SNAP_IDLE_MS);
    };

    const isWithinSnapBand = (y: number) => y > 0 && y < window.innerHeight * SNAP_THRESHOLD_VH;

    const onScroll = () => {
      const y = window.scrollY;
      scrollingUp = y < lastScrollY;
      lastScrollY = y;

      if (scrollingUp && !touchActive && isWithinSnapBand(y)) armSnap();
      else clearSnap();
    };

    const onTouchStart = () => {
      touchActive = true;
      clearSnap();
    };

    const onTouchEnd = () => {
      touchActive = false;
      if (scrollingUp && isWithinSnapBand(window.scrollY)) armSnap();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      clearSnap();
    };
  }, []);

  /** Nudge visitors who haven't scrolled after a few seconds with a clickable "Scroll" cue. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.scrollY <= 1) setScrollHintVisible(true);
    }, SCROLL_HINT_DELAY_MS);

    const onScroll = () => {
      if (window.scrollY > 1) window.clearTimeout(timer);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const targetId = (location.state as { scrollTargetId?: string } | null)?.scrollTargetId;
    if (!targetId) return;
    scrollToId(targetId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  /**
   * Mirrors the `data-home-scrolled` attribute (set by useHomeHeroScene) into React state so the
   * menu can highlight "Welcome" instead of "Home" once the visitor has scrolled past the hero.
   */
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const sync = () => {
      setActiveSectionId(main.hasAttribute('data-home-scrolled') ? HOME_WELCOME_SECTION_ID : undefined);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(main, { attributes: true, attributeFilter: ['data-home-scrolled'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const revealElements = Array.from(main.querySelectorAll<HTMLElement>('.home__reveal'));
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
    <main ref={mainRef} className="home-page home">
      <div className="home__scroll-sink" aria-hidden="true" />
      <div ref={heroShellRef} className="home__hero-shell home__hero-shell--fixed">
        <div ref={imageWrapRef} className="home__hero-image-wrap">
          <HeroImage className="home__hero-img" priority />
        </div>
        <button
          type="button"
          className={`home__hero-scroll-label${scrollHintVisible ? ' home__hero-scroll-label--visible' : ''}`}
          tabIndex={scrollHintVisible ? 0 : -1}
          aria-hidden={!scrollHintVisible}
          onClick={() => scrollToId(HOME_WELCOME_SECTION_ID)}
        >
          Scroll
        </button>
        <div className="home__hero-scroll-hint" aria-hidden="true" />
        <div className="home__hero-name">
          <div className="home__hero-title-stack">
            <p className="landing-auth-title home__guest-name">Emily & Arden</p>
            <p className="home__guest-year">2027</p>
          </div>
        </div>
      </div>
      <div className="home__hero-placeholder" aria-hidden="true" />

      <div className="home__mount-scope">
        <div className="home__fixed-header-wrap">
          <HomeHeader activePath="/home" activeSectionId={activeSectionId} />
        </div>

        <div className="home__scroll-track">
          <section id={HOME_WELCOME_SECTION_ID} className="home__scroll" aria-label="Weekend details">
            <div className="home__scroll-inner">
              <div className="home__weekend-content">
                <div className="home__weekend-text">
                  <p className="home__weekend-greeting home__reveal">{weekendGreeting}</p>
                  <p className="home__weekend-body home__reveal home__reveal--step-1">
                    {weekendBody}
                  </p>
                  <p className="home__weekend-signature home__reveal home__reveal--step-2">
                    {weekendSignature}
                  </p>
                </div>
                <div className="home__weekend-image-wrap home__reveal home__reveal--step-3">
                  <Polaroid
                    className="home__weekend-polaroid"
                    dateText={weekendPolaroidDate}
                    publicId={weekendPolaroidPublicId}
                    alt="Emily and Arden"
                  />
                </div>
              </div>
            </div>
          </section>
          <section ref={gallerySectionRef} className="home__gallery" aria-label="Photo gallery">
            <div ref={galleryPinRef} className="home__gallery-pin">
              <div className="home__gallery-viewport">
                <div className="home__gallery-track">
                  {galleryLoopPublicIds.map((publicId, index) => (
                    <figure key={`${publicId}-${index}`} className="home__gallery-item">
                      <img
                        className="home__gallery-image"
                        src={cloudinaryUrl(publicId, { w: 1200, c: 'limit' })}
                        srcSet={cloudinarySrcSet(publicId, [600, 900, 1200, 1800, 2400])}
                        sizes={GALLERY_SIZES}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </figure>
                  ))}
                </div>
              </div>
              <div className="home__rsvp">
                <RsvpStatusButton />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
