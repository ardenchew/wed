import { useMemo, type CSSProperties } from 'react';
import { HomeHeader } from '../components/HomeHeader';
import { LetterEnvelope } from '../components/LetterEnvelope';
import type { StackPhoto } from '../components/PhotoStack';
import {
  DEFAULT_WEEKEND_POLAROID_DATE,
  DEFAULT_WEEKEND_POLAROID_PUBLIC_ID,
  HOME_GALLERY_PUBLIC_IDS,
} from '../config/homePhotos';
import { HOME_V2_PATH } from '../config/nav';
import { WELCOME_DEFAULTS } from '../guests/shared';
import { useGuest } from '../hooks/useGuest';
import { resolveAsset } from '../utils/asset';

const vineMask = { '--vine-mask': `url(${resolveAsset('/vine.svg')})` } as CSSProperties;

/**
 * Home V2, a side-by-side preview of a redesigned Home: a botanical green border around the
 * screen, and a sealed envelope in the middle holding the guest's letter and polaroids.
 */
export default function HomeV2() {
  const guest = useGuest();
  const polaroids = guest?.polaroids;

  const photos = useMemo<StackPhoto[]>(() => {
    const own = polaroids?.[0];
    const ordered = [
      { publicId: own?.publicId ?? DEFAULT_WEEKEND_POLAROID_PUBLIC_ID, dateText: own?.dateText ?? DEFAULT_WEEKEND_POLAROID_DATE },
      // With their own weekend polaroid, the guest also gets the default one in the pile.
      ...(own ? [{ publicId: DEFAULT_WEEKEND_POLAROID_PUBLIC_ID }] : []),
      ...HOME_GALLERY_PUBLIC_IDS.map((publicId) => ({ publicId })),
      ...(polaroids?.slice(1) ?? []).map(({ publicId, dateText }) => ({ publicId, dateText })),
    ];
    const seen = new Set<string>();
    return ordered
      .filter(({ publicId }) => !seen.has(publicId) && seen.add(publicId))
      .map((photo, index) => ({ ...photo, alt: index === 0 ? 'Emily and Arden' : '' }));
  }, [polaroids]);

  return (
    <main className="home-v2">
      <div className="home-v2__frame" aria-hidden="true">
        <span className="home-v2__vine home-v2__vine--top" style={vineMask} />
        <span className="home-v2__vine home-v2__vine--bottom" style={vineMask} />
        <span className="home-v2__vine home-v2__vine--left" style={vineMask} />
        <span className="home-v2__vine home-v2__vine--right" style={vineMask} />
      </div>
      <div className="home-v2__header">
        <HomeHeader activePath={HOME_V2_PATH} />
      </div>
      <LetterEnvelope
        greeting={guest?.welcomeGreetingText ?? WELCOME_DEFAULTS.greeting}
        body={guest?.welcomeBodyText ?? WELCOME_DEFAULTS.body}
        signature={guest?.welcomeSignatureText ?? WELCOME_DEFAULTS.signature}
        photos={photos}
      />
    </main>
  );
}
