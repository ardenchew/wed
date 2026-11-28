import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { useLetterEnvelope } from '../hooks/useLetterEnvelope';
import { resolveAsset } from '../utils/asset';
import { PhotoStack, type StackPhoto } from './PhotoStack';

const vineMask = { '--vine-mask': `url(${resolveAsset('/vine.svg')})` } as CSSProperties;

interface LetterEnvelopeProps {
  greeting: string;
  body: string;
  signature: string;
  photos: StackPhoto[];
}

type Phase = 'closed' | 'opening' | 'open';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The wax seal's face. Rendered twice (one per half) so it can crack along a jagged line. */
function SealFace() {
  return (
    <span className="envelope__seal-face">
      <span className="envelope__seal-monogram">E&amp;A</span>
    </span>
  );
}

/**
 * A sealed envelope holding the guest's welcome letter and, behind it, a stack of polaroids. A tap
 * or click opens it: the seal cracks, the flap lifts, and the letter and photos come out and settle
 * side by side (letter right, photos left; on phones the photos go below the letter).
 *
 * The envelope is decoration. The letter is ordinary text laid out where it ends up, so it reads
 * the same to screen readers before and after opening. With reduced motion it starts open.
 */
export function LetterEnvelope({ greeting, body, signature, photos }: LetterEnvelopeProps) {
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotion() ? 'open' : 'closed'));
  const contentRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);

  const onOpened = useCallback(() => setPhase('open'), []);
  const playOpening = useLetterEnvelope(
    { contentRef, envelopeRef, letterRef, photosRef },
    phase !== 'closed',
    onOpened,
  );

  const open = () => {
    if (phase !== 'closed') return;
    setPhase('opening');
    playOpening();
  };

  return (
    <div ref={contentRef} className="letter-envelope" data-phase={phase}>
      <article ref={letterRef} className="letter" aria-label="Welcome letter">
        <div className="letter__scroll">
          <div className="letter__ornament" style={vineMask} aria-hidden="true" />
          <p className="letter__greeting">{greeting}</p>
          <p className="letter__body">{body}</p>
          <p className="letter__signature">{signature}</p>
        </div>
        <div className="letter__shade" aria-hidden="true" />
      </article>

      <div ref={photosRef} className="letter-envelope__photos">
        <PhotoStack key={photos.map((photo) => photo.publicId).join()} photos={photos} />
        <div className="letter-envelope__photos-shade" aria-hidden="true" />
      </div>

      {phase === 'closed' && (
        <button type="button" className="letter-envelope__open" onClick={open}>
          <span className="visually-hidden">Open your letter</span>
        </button>
      )}
      {phase !== 'open' && (
        <div ref={envelopeRef} className="envelope" aria-hidden="true">
          {/* Behind the letter: the open flap's lined inside, and the envelope's back panel. */}
          <div className="envelope__layer envelope__layer--back">
            <div className="envelope__hinge">
              <div className="envelope__flap-inner">
                <div className="envelope__flap-inner-shade" />
              </div>
            </div>
            <div className="envelope__back" />
          </div>

          {/* In front of the letter and photos: the pocket, with the lower half of the seal. */}
          <div className="envelope__layer envelope__layer--front">
            <div className="envelope__mask" />
            <div className="envelope__shadow" />
            <div className="envelope__pocket">
              <div className="envelope__side envelope__side--left" />
              <div className="envelope__side envelope__side--right" />
              <div className="envelope__bottom-edge">
                <div className="envelope__bottom" />
              </div>
            </div>
            <div className="envelope__flap-cast" />
            <div className="envelope__seal envelope__seal--lower">
              <SealFace />
            </div>
          </div>

          {/* On top while closed: the flap, carrying the upper half of the seal. */}
          <div className="envelope__layer envelope__layer--flap">
            <div className="envelope__hinge">
              <div className="envelope__flap">
                <div className="envelope__flap-edge">
                  <div className="envelope__flap-paper" />
                </div>
                <div className="envelope__flap-shade" />
                <div className="envelope__seal envelope__seal--upper">
                  <SealFace />
                </div>
              </div>
            </div>
          </div>

          <p className="envelope__hint">Tap to open</p>
        </div>
      )}

    </div>
  );
}
