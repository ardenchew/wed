import { useEffect, useMemo, useRef } from 'react';
import { HomeHeader } from '../components/HomeHeader';
import { Polaroid } from '../components/Polaroid';
import { useGuest } from '../hooks/useGuest';
import { useHomeHeroScene } from '../hooks/useHomeHeroScene';
import { cloudinaryUrl, cloudinarySrcSet } from '../utils/cloudinary';
import '../styles/index.css';

/** Scroll positions below this (× viewport height) are close enough to the hero to snap back up */
const SNAP_THRESHOLD_VH = 0.7;
/** Idle time after the last scroll event before a stalled upward gesture is snapped to the top */
const SNAP_IDLE_MS = 300;

const DEFAULT_WEEKEND_POLAROID_PUBLIC_ID = 'wed/home/emily_arden_stony_hill';
const DEFAULT_WEEKEND_POLAROID_DATE = '9 5 2025';
const HOME_GALLERY_PUBLIC_IDS = ['wed/home/home1', 'wed/home/home2', 'wed/home/home3'];
const HERO_PUBLIC_ID = 'wed/home/hero_crater_lake';

export default function Home() {
  const guest = useGuest();
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

  const weekendGreeting = guest?.welcomeGreetingText ?? 'Welcome!';
  const weekendBody =
    guest?.welcomeBodyText ??
    'We are so happy to celebrate with you. More details for the weekend are coming soon.';
  const weekendSignature = guest?.welcomeSignatureText ?? 'Much love, Emily and Arden';
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
          <img
            className="home__hero-img"
            src={cloudinaryUrl(HERO_PUBLIC_ID, { w: 1800, c: 'limit', q: 95 })}
            srcSet={cloudinarySrcSet(HERO_PUBLIC_ID, [768, 1200, 1800, 2400], 95)}
            sizes="100vw"
            alt=""
            decoding="async"
            loading="eager"
            fetchPriority="high"
          />
        </div>
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
          <HomeHeader activePath="/home" />
        </div>

        <div className="home__scroll-track">
          <section className="home__scroll" aria-label="Weekend details">
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
                        srcSet={cloudinarySrcSet(publicId, [600, 1200, 1800])}
                        sizes="(max-width: 768px) 90vw, 60vw"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </figure>
                  ))}
                </div>
              </div>
              <div className="home__rsvp-placeholder">
                <button type="button" className="ui-button ui-button--text" disabled>
                  RSVP
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
