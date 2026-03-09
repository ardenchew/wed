interface PolaroidProps {
  dateText: string;
  imagePath: string;
  alt?: string;
  className?: string;
}

export function Polaroid({ dateText, imagePath, alt = '', className = '' }: PolaroidProps) {
  const classNames = ['polaroid', className].filter(Boolean).join(' ');
  const isAbsoluteUrl = /^(?:https?:)?\/\//.test(imagePath) || imagePath.startsWith('data:');
  const normalizedPath = imagePath.replace(/^\/+/, '');
  const resolvedImagePath = isAbsoluteUrl
    ? imagePath
    : `${import.meta.env.BASE_URL}${normalizedPath}`;

  return (
    <article className={classNames} aria-label="Photo memory card">
      <div className="polaroid__imageWrap">
        <img
          className="polaroid__image"
          src={resolvedImagePath}
          alt={alt}
          onError={(event) => {
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
