import { RefObject, useLayoutEffect } from 'react';

type SceneRefs = {
  sceneRef: RefObject<HTMLElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  envelopeRef: RefObject<HTMLElement | null>;
  letterRef: RefObject<HTMLElement | null>;
  runwayRef: RefObject<HTMLElement | null>;
};

/** Scroll progress (0 → 1 across the runway) at which each beat starts and ends. */
const BEATS = {
  crack: [0.015, 0.07],
  flap: [0.05, 0.32],
  rise: [0.3, 0.6],
  forward: [0.6, 0.93],
} as const;

/** The letter's width inside the envelope, as a share of the envelope's width. */
const LETTER_INSET_SCALE = 0.84;
/** How far below the envelope's top edge the letter's top sits while tucked in (× envelope height). */
const LETTER_TUCK = 0.08;
/** Gap kept between the risen letter's top edge and the top of the viewport (clears the header). */
const HEADER_CLEARANCE_PX = 64;
/** Gap kept between the sunk envelope's bottom edge and the bottom of the viewport. */
const BOTTOM_CLEARANCE_PX = 14;
/** Share of the relative rise taken up by the envelope sinking rather than the letter lifting. */
const ENVELOPE_SINK_SHARE = 0.35;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const beat = (p: number, [start, end]: readonly [number, number]) => clamp01((p - start) / (end - start));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

type Geometry = {
  /** Letter offset (px) and scale that put it inside the envelope. */
  tuckX: number;
  tuckY: number;
  tuckScale: number;
  /** How far the letter lifts and the envelope sinks during the rise. */
  letterLift: number;
  envelopeSink: number;
  /** Whether the letter clears the envelope completely, so it can pass in front of it. */
  clears: boolean;
  /** How far the envelope drops (px) to leave the viewport once the letter comes forward. */
  envelopeDrop: number;
};

/**
 * Scroll-driven envelope for the Home welcome letter. The scene is a tall wrapper whose sticky
 * stage holds the envelope and the letter; scroll progress through the wrapper's runway is turned
 * into CSS custom properties on the scene, and CSS turns those into `transform` and `opacity`.
 *
 * The letter is laid out in its final, readable place, and every transform is relative to that:
 * at rest (no JS, reduced motion, or the end of the scroll) it's simply a card on the page.
 */
export function useEnvelopeScene({ sceneRef, stageRef, envelopeRef, letterRef, runwayRef }: SceneRefs) {
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const stage = stageRef.current;
    const envelope = envelopeRef.current;
    const letter = letterRef.current;
    const runway = runwayRef.current;
    if (!scene || !stage || !envelope || !letter || !runway) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rafId: number | null = null;
    let geometry: Geometry | null = null;

    const measure = (): Geometry => {
      // offset* ignore transforms, so these are the untransformed layout boxes within the stage.
      const ex = envelope.offsetLeft;
      const ey = envelope.offsetTop;
      const ew = envelope.offsetWidth;
      const eh = envelope.offsetHeight;
      // The envelope is centred in 100svh, so this is the small viewport height the layout uses.
      // Unlike innerHeight it holds still while a mobile browser's toolbar slides in and out.
      const vh = 2 * ey + eh;
      const lx = letter.offsetLeft;
      const ly = letter.offsetTop;
      const lw = Math.max(1, letter.offsetWidth);
      const lh = letter.offsetHeight;

      const tuckScale = (ew * LETTER_INSET_SCALE) / lw;
      const tuckTop = ey + eh * LETTER_TUCK;
      const tuckX = ex + ew / 2 - (lx + lw / 2);
      const tuckY = tuckTop - ly;

      // Relative travel needed for the letter's bottom edge to clear the envelope's top edge.
      const needed = lh * tuckScale + eh * LETTER_TUCK + 12;
      const maxLift = Math.max(0, tuckTop - HEADER_CLEARANCE_PX);
      const maxSink = Math.max(0, vh - BOTTOM_CLEARANCE_PX - (ey + eh));
      const travel = Math.min(needed, maxLift + maxSink);
      const envelopeSink = Math.min(maxSink, Math.max(travel - maxLift, travel * ENVELOPE_SINK_SHARE));

      return {
        tuckX,
        tuckY,
        tuckScale,
        letterLift: travel - envelopeSink,
        envelopeSink,
        clears: needed <= maxLift + maxSink,
        envelopeDrop: vh - ey + 24,
      };
    };

    const render = () => {
      if (!geometry) return;
      const g = geometry;
      const runwayPx = Math.max(1, runway.offsetHeight);
      const p = clamp01(-scene.getBoundingClientRect().top / runwayPx);

      const crack = easeOut(beat(p, BEATS.crack));
      const flap = easeInOut(beat(p, BEATS.flap));
      const rise = easeInOut(beat(p, BEATS.rise));
      const forward = easeInOut(beat(p, BEATS.forward));
      const flapDeg = flap * 180;
      const flapTilt = Math.sin((flapDeg * Math.PI) / 180);

      // Letter: tucked → risen (still envelope-sized) → full size in its own place.
      const risenY = g.tuckY - g.letterLift;
      const letterX = lerp(g.tuckX, 0, forward);
      const letterY = lerp(risenY + (g.tuckY - risenY) * (1 - rise), 0, forward);
      const letterScale = lerp(g.tuckScale, 1, forward);
      const letterTilt = -1.4 * Math.sin(Math.PI * forward) + -0.6 * rise * (1 - forward);

      // Envelope: sinks a little as the letter lifts, then drops away and fades.
      const envelopeY = lerp(g.envelopeSink * rise, g.envelopeDrop, easeInOut(forward));
      const envelopeOpacity = 1 - beat(forward, [0.45, 1]);

      const s = scene.style;
      s.setProperty('--seal-crack', crack.toFixed(3));
      s.setProperty('--flap-rot', `${flapDeg.toFixed(2)}deg`);
      s.setProperty('--flap-shade', (flapTilt * (flap < 0.5 ? 1 : 0)).toFixed(3));
      s.setProperty('--flap-cast', (flapTilt * (flap < 0.5 ? 1 : 0)).toFixed(3));
      s.setProperty('--flap-inner-shade', (flapTilt * (flap >= 0.5 ? 1 : 0)).toFixed(3));
      s.setProperty('--letter-x', `${letterX.toFixed(2)}px`);
      s.setProperty('--letter-y', `${letterY.toFixed(2)}px`);
      s.setProperty('--letter-s', letterScale.toFixed(4));
      s.setProperty('--letter-r', `${letterTilt.toFixed(3)}deg`);
      s.setProperty('--letter-shade', (1 - easeOut(beat(p, [BEATS.flap[1] - 0.06, BEATS.forward[0] + 0.1]))).toFixed(3));
      s.setProperty('--env-y', `${envelopeY.toFixed(2)}px`);
      s.setProperty('--env-o', envelopeOpacity.toFixed(3));
      // Once the letter is fully out it can pass in front of the envelope without looking like it's
      // going back in. A long letter never clears, so it stays behind the pocket as the envelope drops.
      scene.toggleAttribute('data-letter-front', g.clears && p >= BEATS.rise[1]);
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        render();
      });
    };

    const remeasure = () => {
      if (!scene.classList.contains('is-animated')) return;
      geometry = measure();
      render();
    };

    const sync = () => {
      const animate = !mq.matches;
      scene.classList.toggle('is-animated', animate);
      if (animate) {
        remeasure();
      } else {
        geometry = null;
        scene.removeAttribute('style');
        scene.removeAttribute('data-letter-front');
      }
    };

    sync();

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure);
    resizeObserver?.observe(letter);
    resizeObserver?.observe(stage);

    mq.addEventListener('change', sync);
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', schedule, { passive: true });

    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', schedule);
      resizeObserver?.disconnect();
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [sceneRef, stageRef, envelopeRef, letterRef, runwayRef]);
}
