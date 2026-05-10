import { resolveAsset } from '../utils/asset';

interface PolaroidProps {
  dateText: string;
  imagePath: string;
  alt?: string;
  className?: string;
}

export function Polaroid({ dateText, imagePath, alt = '', className = '' }: PolaroidProps) {
  const classNames = ['polaroid', className].filter(Boolean).join(' ');
  const resolvedImagePath = resolveAsset(imagePath);

  return (
    <article className={classNames} aria-label="Photo memory card">
      <div className="polaroid__imageWrap">
        <img
          className="polaroid__image"
          src={resolvedImagePath}
          alt={alt}
          onError={(event) => {
            // fallback for dev-server hits without /wed/ base
            const target = event.currentTarget;
            if (target.dataset.fallbackApplied === 'true') {
              return;
            }
            target.dataset.fallbackApplied = 'true';
            target.src = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
          }}
        />
        <p className="polaroid__date">{dateText}</p>
      </div>
    </article>
  );
}
