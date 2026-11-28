import { useLayoutEffect, type RefObject } from 'react';

/**
 * Fades up every `[data-reveal]` element inside `rootRef` the first time it scrolls into view.
 *
 * Elements start visible (so the page works without JS). On mount, only the ones still below the
 * fold are marked `data-reveal-state="hidden"`; anything already on screen is left alone, so
 * nothing flashes. The observer then clears the mark as each one enters the viewport, and the CSS
 * transition does the rest. With `prefers-reduced-motion`, nothing is hidden at all.
 *
 * This touches DOM attributes directly rather than React state, so the content never re-renders.
 * Pass `key` to re-scan when the set of revealed elements changes.
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>, key: unknown) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).removeAttribute('data-reveal-state');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );

    const pending: HTMLElement[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (el.getBoundingClientRect().top <= window.innerHeight) continue;
      el.setAttribute('data-reveal-state', 'hidden');
      observer.observe(el);
      pending.push(el);
    }

    return () => {
      observer.disconnect();
      for (const el of pending) el.removeAttribute('data-reveal-state');
    };
  }, [rootRef, key]);
}
