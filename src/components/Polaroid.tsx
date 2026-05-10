import { cloudinaryUrl, cloudinarySrcSet } from '../utils/cloudinary';

interface PolaroidProps {
  dateText: string;
  /** Cloudinary public_id, e.g. `wed/guests/debbie_kwan/1`. */
  publicId: string;
  alt?: string;
  className?: string;
}

export function Polaroid({ dateText, publicId, alt = '', className = '' }: PolaroidProps) {
  const classNames = ['polaroid', className].filter(Boolean).join(' ');

  return (
    <article className={classNames} aria-label="Photo memory card">
      <div className="polaroid__imageWrap">
        <img
          className="polaroid__image"
          src={cloudinaryUrl(publicId, { w: 600, c: 'limit' })}
          srcSet={cloudinarySrcSet(publicId, [400, 600, 900])}
          sizes="(max-width: 768px) 80vw, 360px"
          alt={alt}
          loading="lazy"
          decoding="async"
        />
        <p className="polaroid__date">{dateText}</p>
      </div>
    </article>
  );
}
