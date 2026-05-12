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
    <section ref={sectionRef} className="home__gallery" aria-label="Photo gallery">
      <div ref={pinRef} className="home__gallery-pin">
        <div className="home__gallery-viewport">
          <div className="home__gallery-track">
            {loopedImagePaths.map((imagePath, index) => (
              <figure key={`${imagePath}-${index}`} className="home__gallery-item">
                <img
                  className="home__gallery-image"
                  src={resolveAsset(imagePath)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </div>
        <div className="home__rsvp-placeholder">
          <button type="button" className="ui-button ui-button--text" disabled>
            RSVP
          </button>
        </div>
      </div>
    </section>
  );
}
