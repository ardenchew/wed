import { RefObject, useCallback, useLayoutEffect } from 'react';

type Refs = {
  /** Positioned box the envelope, letter and photos are laid out in. */
  contentRef: RefObject<HTMLElement | null>;
  envelopeRef: RefObject<HTMLElement | null>;
  letterRef: RefObject<HTMLElement | null>;
  photosRef: RefObject<HTMLElement | null>;
};

type Pose = { x: number; y: number; s: number; r: number };

/** Length of the whole opening, from the seal cracking to the letter and photos settling. */
const DURATION_MS = 2800;
const EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';
/** Accelerates away: the envelope dropping out from under the letter. */
const EASE_IN = 'cubic-bezier(0.55, 0, 0.8, 0.4)';

/** Width of the letter and of the photo stack inside the envelope, as shares of its width. */
const LETTER_TUCK_WIDTH = 0.84;
const PHOTOS_TUCK_WIDTH = 0.58;
/** How far below the envelope's top edge each sits while tucked in (× envelope height). */
const LETTER_TUCK_TOP = 0.08;
const PHOTOS_TUCK_TOP = 0.2;
/** Share of the rise taken by the envelope sinking rather than the letter lifting. */
const ENVELOPE_SINK_SHARE = 0.35;
/** The photos come up less far than the letter, so they stay in front of its lower half. */
const PHOTOS_LIFT_SHARE = 0.7;

const pose = ({ x, y, s, r }: Pose) =>
  `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)}) rotate(${r}deg)`;
const SETTLED = pose({ x: 0, y: 0, s: 1, r: 0 });

/** Offset of `el` from `content`, ignoring transforms (offset* skips them). */
function offsetWithin(el: HTMLElement, content: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== content) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

function measure(content: HTMLElement, envelope: HTMLElement, letter: HTMLElement, photos: HTMLElement) {
  const env = offsetWithin(envelope, content);
  const ew = envelope.offsetWidth;
  const eh = envelope.offsetHeight;
  const envCenterX = env.x + ew / 2;
  // The envelope is centred in 100svh, which makes this the viewport height the layout uses.
  const vh = 2 * env.y + eh;
  const style = getComputedStyle(content);
  const topLimit = parseFloat(style.paddingTop) || 0;
  const bottomLimit = parseFloat(style.paddingBottom) || 0;

  const tuck = (el: HTMLElement, widthShare: number, topShare: number): Pose & { h: number } => {
    const at = offsetWithin(el, content);
    const w = Math.max(1, el.offsetWidth);
    const s = (ew * widthShare) / w;
    return {
      // transform-origin is the top centre.
      x: envCenterX - (at.x + w / 2),
      y: env.y + eh * topShare - at.y,
      s,
      r: 0,
      h: el.offsetHeight * s,
    };
  };

  const letterTuck = tuck(letter, LETTER_TUCK_WIDTH, LETTER_TUCK_TOP);
  const photosTuck = tuck(photos, PHOTOS_TUCK_WIDTH, PHOTOS_TUCK_TOP);

  // Relative travel for the letter to clear the envelope's top edge, shared between the letter
  // lifting and the envelope sinking. A long letter can't clear, so it stays behind the pocket
  // until the envelope drops away beneath it.
  const tuckTop = env.y + eh * LETTER_TUCK_TOP;
  const needed = letterTuck.h + eh * LETTER_TUCK_TOP + 12;
  const maxLift = Math.max(0, tuckTop - topLimit);
  const maxSink = Math.max(0, vh - bottomLimit - (env.y + eh));
  const travel = Math.min(needed, maxLift + maxSink);
  const sink = Math.min(maxSink, Math.max(travel - maxLift, travel * ENVELOPE_SINK_SHARE));
  const lift = travel - sink;

  return {
    letterTuck,
    photosTuck,
    letterRisen: { ...letterTuck, y: letterTuck.y - lift, r: -0.8 },
    photosRisen: { ...photosTuck, y: photosTuck.y - lift * PHOTOS_LIFT_SHARE, r: 2 },
    sink,
    drop: vh - env.y + 40,
  };
}

/**
 * Tucks the letter and the photo stack into the envelope (while `opened` is false) and plays the
 * opening when `open()` is called: the seal cracks, the flap swings up, the letter and photos rise
 * out of the pocket, and they move to their own places while the envelope drops away.
 *
 * Both are laid out where they end up; every transform is relative to that, so the settled state
 * is simply no transform at all. Only `transform` and `opacity` are animated.
 */
export function useLetterEnvelope(
  { contentRef, envelopeRef, letterRef, photosRef }: Refs,
  opened: boolean,
  onOpened: () => void,
) {
  // While closed, keep the letter and photos tucked in, re-measuring whenever the layout changes.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const envelope = envelopeRef.current;
    const letter = letterRef.current;
    const photos = photosRef.current;
    if (!content || !envelope || !letter || !photos || opened) return;

    const tuckIn = () => {
      const g = measure(content, envelope, letter, photos);
      letter.style.transform = pose(g.letterTuck);
      photos.style.transform = pose(g.photosTuck);
    };
    tuckIn();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(tuckIn);
    observer?.observe(content);
    observer?.observe(letter);
    observer?.observe(photos);
    window.addEventListener('resize', tuckIn);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', tuckIn);
    };
  }, [contentRef, envelopeRef, letterRef, photosRef, opened]);

  return useCallback(() => {
    const content = contentRef.current;
    const envelope = envelopeRef.current;
    const letter = letterRef.current;
    const photos = photosRef.current;
    if (!content || !envelope || !letter || !photos) return;

    const g = measure(content, envelope, letter, photos);
    const part = (selector: string) => envelope.querySelector<HTMLElement>(selector);
    const animations: Animation[] = [];
    const play = (el: Element | null, keyframes: Keyframe[]) => {
      if (!el) return undefined;
      const animation = el.animate(keyframes, { duration: DURATION_MS, fill: 'forwards' });
      animations.push(animation);
      return animation;
    };

    // Seal cracks.
    play(part('.envelope__seal--upper'), [
      { offset: 0, transform: 'translate(0px, 0px) rotate(0deg)', easing: 'ease-out' },
      { offset: 0.06, transform: 'translate(-0.5px, -1.5px) rotate(-2.5deg)' },
      { offset: 1, transform: 'translate(-0.5px, -1.5px) rotate(-2.5deg)' },
    ]);
    play(part('.envelope__seal--lower'), [
      { offset: 0, transform: 'translate(0px, 0px) rotate(0deg)', easing: 'ease-out' },
      { offset: 0.06, transform: 'translate(1px, 2.5px) rotate(3deg)' },
      { offset: 1, transform: 'translate(1px, 2.5px) rotate(3deg)' },
    ]);

    // Flap swings up toward the viewer; past 90° its lined inside takes over.
    play(part('.envelope__flap'), [
      { offset: 0, transform: 'rotateX(0deg)' },
      { offset: 0.05, transform: 'rotateX(0deg)', easing: EASE },
      { offset: 0.34, transform: 'rotateX(180deg)' },
      { offset: 1, transform: 'rotateX(180deg)' },
    ]);
    play(part('.envelope__flap-inner'), [
      { offset: 0, transform: 'rotateX(-180deg)' },
      { offset: 0.05, transform: 'rotateX(-180deg)', easing: EASE },
      { offset: 0.34, transform: 'rotateX(0deg)' },
      { offset: 1, transform: 'rotateX(0deg)' },
    ]);
    play(part('.envelope__flap-shade'), [
      { offset: 0, opacity: 0 },
      { offset: 0.05, opacity: 0 },
      { offset: 0.2, opacity: 1 },
      { offset: 1, opacity: 1 },
    ]);
    play(part('.envelope__flap-inner-shade'), [
      { offset: 0, opacity: 1 },
      { offset: 0.2, opacity: 1 },
      { offset: 0.34, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    play(part('.envelope__flap-cast'), [
      { offset: 0, opacity: 0 },
      { offset: 0.05, opacity: 0 },
      { offset: 0.13, opacity: 0.9 },
      { offset: 0.2, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    // Envelope sinks a little as the letter lifts, then drops away and fades.
    const envelopeFrames: Keyframe[] = [
      { offset: 0, transform: 'translate(0px, 0px)', opacity: 1 },
      { offset: 0.34, transform: 'translate(0px, 0px)', opacity: 1, easing: EASE },
      { offset: 0.62, transform: `translate(0px, ${g.sink}px)`, opacity: 1, easing: EASE_IN },
      // Gone before the photos pass where it was (on phones they settle below the letter).
      { offset: 0.84, transform: `translate(0px, ${g.drop}px)`, opacity: 0 },
      { offset: 1, transform: `translate(0px, ${g.drop}px)`, opacity: 0 },
    ];
    envelope.querySelectorAll('.envelope__layer').forEach((layer) => play(layer, envelopeFrames));
    play(part('.envelope__hint'), [
      { offset: 0, opacity: 1 },
      { offset: 0.08, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    // Letter and photos rise out of the pocket, then settle in their own places.
    const letterMove = play(letter, [
      { offset: 0, transform: pose(g.letterTuck) },
      { offset: 0.34, transform: pose(g.letterTuck), easing: EASE },
      { offset: 0.62, transform: pose(g.letterRisen), easing: EASE },
      { offset: 1, transform: SETTLED },
    ]);
    const photosMove = play(photos, [
      { offset: 0, transform: pose(g.photosTuck) },
      { offset: 0.37, transform: pose(g.photosTuck), easing: EASE },
      { offset: 0.64, transform: pose(g.photosRisen) },
      { offset: 0.7, transform: pose(g.photosRisen), easing: EASE },
      { offset: 1, transform: SETTLED },
    ]);
    const shade: Keyframe[] = [
      { offset: 0, opacity: 1 },
      { offset: 0.38, opacity: 1 },
      { offset: 0.72, opacity: 0 },
      { offset: 1, opacity: 0 },
    ];
    play(letter.querySelector('.letter__shade'), shade);
    play(photos.querySelector('.letter-envelope__photos-shade'), shade);

    Promise.all(animations.map((a) => a.finished))
      .then(() => {
        // The letter and photos end untransformed; drop their animations and the inline tuck so
        // nothing stale is left behind if the layout changes later. The envelope's animations stay
        // filled until it's hidden.
        letter.style.transform = '';
        photos.style.transform = '';
        letterMove?.cancel();
        photosMove?.cancel();
        onOpened();
      })
      .catch(() => {
        // Cancelled (the page unmounted mid-opening): nothing to settle.
      });
  }, [contentRef, envelopeRef, letterRef, photosRef, onOpened]);
}
