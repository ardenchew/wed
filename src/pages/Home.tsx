import { useMemo, useRef, type CSSProperties } from 'react';
import { HomeHeader } from '../components/HomeHeader';
import { LetterEnvelope, type LetterEnvelopeHandle } from '../components/LetterEnvelope';
import type { StackPhoto } from '../components/PhotoStack';
import {
  DEFAULT_WEEKEND_POLAROID_DATE,
  DEFAULT_WEEKEND_POLAROID_PUBLIC_ID,
  HOME_GALLERY_PUBLIC_IDS,
} from '../config/homePhotos';
import { HOME_PATH } from '../config/nav';
import { WELCOME_DEFAULTS } from '../guests/shared';
import { useGuest } from '../hooks/useGuest';
import { resolveAsset } from '../utils/asset';

const vineMask = { '--vine-mask': `url(${resolveAsset('/vine.svg')})` } as CSSProperties;

/**
 * Home, where guests land after signing in: a botanical green border around the screen, and a
 * sealed envelope in the middle holding the guest's letter and polaroids. The logo puts everything
 * back in the envelope. (The previous photo-hero Home lives on as Home V2.)
 */
export default function Home() {
  const guest = useGuest();
  const envelopeRef = useRef<LetterEnvelopeHandle>(null);
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
    <main className="letter-home">
      <div className="letter-home__frame" aria-hidden="true">
        <span className="letter-home__vine letter-home__vine--top" style={vineMask} />
        <span className="letter-home__vine letter-home__vine--bottom" style={vineMask} />
        <span className="letter-home__vine letter-home__vine--left" style={vineMask} />
        <span className="letter-home__vine letter-home__vine--right" style={vineMask} />
      </div>
      <div className="letter-home__header">
        {/* Here the logo reseals the envelope rather than going to Home. */}
        <HomeHeader activePath={HOME_PATH} onLogoClick={() => envelopeRef.current?.close()} />
      </div>
      <LetterEnvelope
        ref={envelopeRef}
        greeting={guest?.welcomeGreetingText ?? WELCOME_DEFAULTS.greeting}
        body={guest?.welcomeBodyText ?? WELCOME_DEFAULTS.body}
        signature={guest?.welcomeSignatureText ?? WELCOME_DEFAULTS.signature}
        photos={photos}
        recipient={guest?.slug ?? ''}
        // A different guest gets their own envelope, sealed.
        key={guest?.slug ?? ''}
      />
    </main>
  );
}
