import { useMemo, useRef } from 'react';
import { HomeGallery } from '../components/HomeGallery';
import { HomeHeader } from '../components/HomeHeader';
import { Polaroid } from '../components/Polaroid';
import { useGuest } from '../hooks/useGuest';
import { useHomeV2HeroScene } from '../hooks/useHomeV2HeroScene';
import { useRevealObserver } from '../hooks/useRevealObserver';
import { resolveAsset } from '../utils/asset';
import '../styles/index.css';

const DEFAULT_WEEKEND_POLAROID_IMAGE = '/emily_arden_stony_hill.png';
const DEFAULT_WEEKEND_POLAROID_DATE = '9 5 2025';
const HOME_GALLERY_IMAGE_PATHS = ['/home/home1.png', '/home/home2.png', '/home/home3.png'];

export default function HomeV2() {
  const guest = useGuest();
  const mainRef = useRef<HTMLElement>(null);
  const heroShellRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLElement>(null);
  const galleryPinRef = useRef<HTMLDivElement>(null);

  const weekendGreeting = guest?.welcomeGreetingText ?? 'Welcome!';
  const weekendBody =
    guest?.welcomeBodyText ??
    'We are so happy to celebrate with you. More details for the weekend are coming soon.';
  const weekendSignature = guest?.welcomeSignatureText ?? 'Much love, Emily and Arden';
  const weekendPolaroidPath = guest?.polaroid2?.imagePath ?? DEFAULT_WEEKEND_POLAROID_IMAGE;
  const weekendPolaroidDate = guest?.polaroid2?.dateText ?? DEFAULT_WEEKEND_POLAROID_DATE;
  const hasGuestPolaroid2 = Boolean(guest?.polaroid2?.imagePath);

  const guestGalleryImagePaths = useMemo(() => {
    if (!guest) return [];
    return Object.entries(guest).flatMap(([key, value]) => {
      if (
        !key.startsWith('polaroid') ||
        key === 'polaroid2' ||
        !value ||
        typeof value !== 'object' ||
        !('imagePath' in value)
      ) {
        return [];
      }

      const imagePath = value.imagePath;
      return typeof imagePath === 'string' && imagePath.length > 0 ? [imagePath] : [];
    });
  }, [guest]);

  const galleryImagePaths = useMemo(() => {
    const ordered = [
      ...(hasGuestPolaroid2 ? [DEFAULT_WEEKEND_POLAROID_IMAGE] : []),
      ...HOME_GALLERY_IMAGE_PATHS,
      ...guestGalleryImagePaths,
    ];
    const seen = new Set<string>();
    return ordered.filter((path) => {
      const normalized = path.startsWith('/') ? path : `/${path}`;
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [guestGalleryImagePaths, hasGuestPolaroid2]);

  useHomeV2HeroScene({
    mainRef,
    heroShellRef,
    imageWrapRef,
    gallerySectionRef,
    galleryPinRef,
  });
  useRevealObserver(mainRef);

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
          <HomeHeader activePath="/home-v2" />
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
          <HomeGallery
            sectionRef={gallerySectionRef}
            pinRef={galleryPinRef}
            imagePaths={galleryImagePaths}
          />
        </div>
      </div>
    </main>
  );
}
