import { useRef, type CSSProperties } from 'react';
import { useEnvelopeScene } from '../hooks/useEnvelopeScene';
import { resolveAsset } from '../utils/asset';

const vineMask = { '--vine-mask': `url(${resolveAsset('/vine.svg')})` } as CSSProperties;

interface WelcomeEnvelopeProps {
  greeting: string;
  body: string;
  signature: string;
}

/** The wax seal's face. Rendered twice (one per half) so it can crack along a jagged line. */
function SealFace() {
  return (
    <span className="envelope__seal-face">
      <span className="envelope__seal-monogram">E&amp;A</span>
    </span>
  );
}

/**
 * The guest's welcome letter, delivered in a sealed envelope that opens as they scroll: the seal
 * cracks, the flap lifts, the letter slides out of the pocket and comes forward to be read.
 *
 * The envelope is decoration (`aria-hidden`). The letter is ordinary text that is laid out in its
 * final place, so it reads the same without JS, with reduced motion, and to screen readers.
 */
export function WelcomeEnvelope({ greeting, body, signature }: WelcomeEnvelopeProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);

  useEnvelopeScene({ sceneRef, stageRef, envelopeRef, letterRef, runwayRef });

  return (
    <div ref={sceneRef} className="envelope-scene">
      <div ref={stageRef} className="envelope-scene__stage">
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

          {/* In front of the letter: the pocket, and the lower half of the seal stuck to it. */}
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
        </div>

        <article ref={letterRef} className="letter" aria-label="Welcome letter">
          <div className="letter__ornament" style={vineMask} aria-hidden="true" />
          <p className="letter__greeting">{greeting}</p>
          <p className="letter__body">{body}</p>
          <p className="letter__signature">{signature}</p>
        </article>
      </div>
      <div ref={runwayRef} className="envelope-scene__runway" aria-hidden="true" />
    </div>
  );
}
