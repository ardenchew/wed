import { cloudinaryUrl, cloudinarySrcSet } from '../utils/cloudinary';

const HERO_PUBLIC_ID = 'wed/home/hero_crater_lake';
const HERO_QUALITY = 95;
const HERO_WIDTHS = [800, 1200, 1600, 2000, 2600, 3200];

/**
 * The hero photo is 4:3 and fills the viewport with `object-fit: cover`, so on any screen
 * narrower than 4:3 (every phone, most tablets) it is the *height* that decides how wide the
 * image must be: 100vh × 4/3 ≈ 134vh. `sizes="100vw"` would under-fetch by ~2–3× on phones.
 */
const HERO_SIZES = '(max-aspect-ratio: 4/3) 134vh, 100vw';

interface HeroImageProps {
  className: string;
  /** The above-the-fold copy should load first; other uses can leave this off. */
  priority?: boolean;
}

/**
 * Crater Lake hero shared by Landing and Home. Both use the same `srcset`, so the browser
 * downloads it once and reuses it when the guest signs in.
 */
export function HeroImage({ className, priority = false }: HeroImageProps) {
  return (
    <img
      className={className}
      src={cloudinaryUrl(HERO_PUBLIC_ID, { w: 1600, c: 'limit', q: HERO_QUALITY })}
      srcSet={cloudinarySrcSet(HERO_PUBLIC_ID, HERO_WIDTHS, HERO_QUALITY)}
      sizes={HERO_SIZES}
      alt=""
      aria-hidden="true"
      decoding="async"
      loading="eager"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
