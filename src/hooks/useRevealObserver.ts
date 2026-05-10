import { RefObject, useEffect } from 'react';

/** Adds `is-visible` to `.home-v2__reveal` elements inside `containerRef` as they enter the viewport. */
export function useRevealObserver(containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const revealElements = Array.from(container.querySelectorAll<HTMLElement>('.home-v2__reveal'));
    if (!revealElements.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      revealElements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          (entry.target as HTMLElement).classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      {
        threshold: 0.24,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef]);
}
