import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { cloudinarySrcSet, cloudinaryUrl } from '../utils/cloudinary';

export interface StackPhoto {
  publicId: string;
  /** Shown in the polaroid's corner, like a camera date stamp. */
  dateText?: string;
  alt: string;
}

interface PhotoStackProps {
  photos: StackPhoto[];
  className?: string;
}

/**
 * Where each depth of the stack sits: offset (px) and tilt. Index 0 is the top card. The angles
 * alternate sides so the pile looks tossed together rather than squared up.
 */
const SLOTS = [
  { x: 0, y: 0, r: -2 },
  { x: 16, y: -8, r: 6 },
  { x: -18, y: 6, r: -8 },
  { x: 12, y: 12, r: 10 },
  { x: -10, y: -12, r: -5 },
  { x: 20, y: 4, r: 3 },
];
const MAX_CARDS = SLOTS.length;

/** While a mouse rests on the stack, the top card goes to the back this often. */
const HOVER_CYCLE_MS = 1400;

/**
 * An artsy pile of polaroids that cycles: the top card swings out and tucks in at the back. A tap,
 * click, Enter or Space does it once; a mouse resting on the stack keeps it going until it leaves.
 */
export function PhotoStack({ photos, className = '' }: PhotoStackProps) {
  const cards = photos.slice(0, MAX_CARDS);
  /** How many times the stack has cycled; card `i` is at depth `(i - turns) mod n`. */
  const [turns, setTurns] = useState(0);
  const hoverTimerRef = useRef<number | null>(null);

  const stopHoverCycle = () => {
    if (hoverTimerRef.current != null) window.clearInterval(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };

  useEffect(() => stopHoverCycle, []);

  const next = () => setTurns((t) => t + 1);

  const startHoverCycle = () => {
    stopHoverCycle();
    hoverTimerRef.current = window.setInterval(next, HOVER_CYCLE_MS);
  };

  const onPointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse' || cards.length < 2) return;
    next();
    startHoverCycle();
  };

  const onPointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') stopHoverCycle();
  };

  /** Taps, clicks and the keyboard each turn the stack once. */
  const onClick = () => {
    if (cards.length < 2) return;
    next();
    // Mid-hover, restart the beat so the click and the next automatic turn don't land together.
    if (hoverTimerRef.current != null) startHoverCycle();
  };

  const n = cards.length;
  const topCard = n ? turns % n : 0;
  /** The card that just went to the back plays the swing; alternate sides each turn. */
  const pulledCard = turns > 0 ? (turns - 1) % n : -1;
  const pullDir = turns % 2 ? 1 : -1;

  return (
    <button
      type="button"
      className={`photo-stack ${className}`.trim()}
      aria-label={`Photo ${topCard + 1} of ${n}. Show the next photo`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      {cards.map((photo, card) => {
        const depth = (((card - turns) % n) + n) % n;
        const slot = SLOTS[depth];
        const isPulled = card === pulledCard;
        const style = {
          '--x': `${slot.x}px`,
          '--y': `${slot.y}px`,
          '--r': `${slot.r}deg`,
          '--pull-dir': pullDir,
          zIndex: n - depth,
        } as CSSProperties;

        return (
          <span
            key={photo.publicId}
            className="photo-stack__card"
            style={style}
            data-pull={isPulled ? (turns % 2 ? 'a' : 'b') : undefined}
          >
            <span className="polaroid photo-stack__polaroid">
              <span className="polaroid__imageWrap">
                <img
                  className="polaroid__image"
                  src={cloudinaryUrl(photo.publicId, { w: 600, c: 'limit' })}
                  srcSet={cloudinarySrcSet(photo.publicId, [400, 600, 900])}
                  sizes="(max-width: 640px) 300px, 320px"
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                {photo.dateText && <span className="polaroid__date">{photo.dateText}</span>}
              </span>
            </span>
          </span>
        );
      })}
    </button>
  );
}
