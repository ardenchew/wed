import { useCallback, useEffect, useState } from 'react';
import { resolveAsset } from '../utils/asset';

type Props = {
  onComplete: () => void;
  /** No timers or fade; for /#/splash preview only */
  staticPreview?: boolean;
};

const DISPLAY_MS = 1600;
const FADE_MS = 720;

export function FreshLoadSplash({ onComplete, staticPreview = false }: Props) {
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    document.documentElement.classList.remove('pre-splash');
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    document.body.classList.add('splash-active');

    if (staticPreview) {
      return () => document.body.classList.remove('splash-active');
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const displayDelay = reduced ? 200 : DISPLAY_MS;

    const showTimer = window.setTimeout(() => setExiting(true), displayDelay);

    return () => {
      window.clearTimeout(showTimer);
      document.body.classList.remove('splash-active');
    };
  }, [staticPreview]);

  useEffect(() => {
    if (staticPreview || !exiting) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fadeDuration = reduced ? 0 : FADE_MS;
    const doneTimer = window.setTimeout(finish, fadeDuration);

    return () => window.clearTimeout(doneTimer);
  }, [exiting, finish, staticPreview]);

  return (
    <div
      className={`fresh-load-splash${exiting ? ' fresh-load-splash--exiting' : ''}`}
      aria-hidden
    >
      <div className="fresh-load-splash__stack">
        <p className="fresh-load-splash__name">Emily</p>
        <img
          className="fresh-load-splash__logo"
          src={resolveAsset('logo.svg')}
          alt=""
          width={89}
          height={90}
        />
        <p className="fresh-load-splash__name">Arden</p>
      </div>
    </div>
  );
}
