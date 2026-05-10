import { RefObject, useMemo } from 'react';
import { resolveAsset } from '../utils/asset';

interface HomeGalleryProps {
  sectionRef: RefObject<HTMLElement>;
  pinRef: RefObject<HTMLDivElement>;
  /** Unique image paths; the gallery doubles them so the marquee loop is seamless. */
  imagePaths: string[];
}

export function HomeGallery({ sectionRef, pinRef, imagePaths }: HomeGalleryProps) {
  const loopedImagePaths = useMemo(() => [...imagePaths, ...imagePaths], [imagePaths]);

  return (
    <section ref={sectionRef} className="home-v2__gallery" aria-label="Photo gallery">
      <div ref={pinRef} className="home-v2__gallery-pin">
        <div className="home-v2__gallery-viewport">
          <div className="home-v2__gallery-track">
            {loopedImagePaths.map((imagePath, index) => (
              <figure key={`${imagePath}-${index}`} className="home-v2__gallery-item">
                <img
                  className="home-v2__gallery-image"
                  src={resolveAsset(imagePath)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </div>
        <div className="home-v2__rsvp-placeholder">
          <button type="button" className="ui-button ui-button--text" disabled>
            RSVP
          </button>
        </div>
      </div>
    </section>
  );
}
