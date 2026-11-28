import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
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
 * alternate sides so every card behind the top one shows an edge you can reach.
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

/** Ignore further hovers while a card is still swinging round, so the stack can't cascade. */
const HOVER_COOLDOWN_MS = 450;
/** A click this soon after hovering the same card to the front is the same gesture, not "next". */
const CLICK_AFTER_HOVER_MS = 700;

type Pull = { card: number; tick: number; dir: 1 | -1 };

/**
 * An artsy pile of polaroids. Hovering (mouse) or tapping a card behind the top one swings it out
 * and back onto the top of the pile; clicking or tapping the top card tucks it underneath, so a
 * guest on a phone can flip through them all.
 */
export function PhotoStack({ photos, className = '' }: PhotoStackProps) {
  const cards = photos.slice(0, MAX_CARDS);
  /** `order[depth]` is the card at that depth; depth 0 is on top. */
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [pull, setPull] = useState<Pull | null>(null);
  const lastShuffleRef = useRef({ card: -1, at: -Infinity, viaHover: false });

  // Times come from the triggering event's `timeStamp` (same clock as performance.now()).
  const shuffle = (card: number, nextOrder: number[], dir: 1 | -1, at: number, viaHover: boolean) => {
    lastShuffleRef.current = { card, at, viaHover };
    setOrder(nextOrder);
    setPull((prev) => ({ card, dir, tick: (prev?.tick ?? 0) + 1 }));
  };

  const bringToFront = (card: number, at: number, viaHover: boolean) => {
    const depth = order.indexOf(card);
    if (depth <= 0) return;
    // Swing out on the side the card is already leaning toward.
    const dir = SLOTS[depth].x >= 0 ? 1 : -1;
    shuffle(card, [card, ...order.filter((c) => c !== card)], dir, at, viaHover);
  };

  const sendToBack = (card: number, at: number) => {
    shuffle(card, [...order.filter((c) => c !== card), card], -1, at, false);
  };

  const onPointerEnter = (card: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (event.timeStamp - lastShuffleRef.current.at < HOVER_COOLDOWN_MS) return;
    bringToFront(card, event.timeStamp, true);
  };

  const onClick = (card: number) => (event: MouseEvent<HTMLButtonElement>) => {
    const at = event.timeStamp;
    if (order[0] !== card) {
      bringToFront(card, at, false);
      return;
    }
    const last = lastShuffleRef.current;
    const justHovered =
      last.viaHover && last.card === card && at - last.at < CLICK_AFTER_HOVER_MS;
    if (!justHovered && cards.length > 1) sendToBack(card, at);
  };

  return (
    <div className={`photo-stack ${className}`.trim()} role="group" aria-label="Photos">
      {cards.map((photo, card) => {
        const depth = order.indexOf(card);
        const slot = SLOTS[depth];
        const isTop = depth === 0;
        const isPulled = pull?.card === card;
        const style = {
          '--x': `${slot.x}px`,
          '--y': `${slot.y}px`,
          '--r': `${slot.r}deg`,
          '--pull-dir': isPulled ? pull.dir : 1,
          zIndex: cards.length - depth,
        } as CSSProperties;

        return (
          <button
            key={photo.publicId}
            type="button"
            className="photo-stack__card"
            style={style}
            data-pull={isPulled ? (pull.tick % 2 ? 'a' : 'b') : undefined}
            aria-label={
              isTop
                ? `Photo ${card + 1} of ${cards.length}, on top. Show the next one`
                : `Bring photo ${card + 1} to the top`
            }
            onPointerEnter={onPointerEnter(card)}
            onClick={onClick(card)}
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
          </button>
        );
      })}
    </div>
  );
}
