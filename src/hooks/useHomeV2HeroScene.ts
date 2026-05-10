import { RefObject, useLayoutEffect } from 'react';
import {
  COMPRESS_VH,
  FADE_VH,
  FALLBACK_PAGE_BG_RGB,
  MIN_SCALE_FALLBACK,
  computeHeroMinScaleForHeader,
  readSolidBackgroundRgb,
} from '../utils/homeV2Hero';

type SceneRefs = {
  mainRef: RefObject<HTMLElement>;
  heroShellRef: RefObject<HTMLDivElement>;
  imageWrapRef: RefObject<HTMLDivElement>;
  gallerySectionRef: RefObject<HTMLElement>;
  galleryPinRef: RefObject<HTMLDivElement>;
};

/** Hero-fade fraction at which the header icons swap to dark (and below which they swap back when the bottom-fade kicks in). */
const HEADER_DARK_THRESHOLD = 0.55;
/** Gallery-section top position (× vh) where the bottom-of-page fade begins. */
const BOTTOM_FADE_START_VH = 0.9;
/** Gallery-section top position (× vh) where the bottom-of-page fade completes. */
const BOTTOM_FADE_END_VH = 0.14;
/** Max upward lift (× vh) applied to the gallery pin at full bottom-fade. */
const GALLERY_LIFT_MAX_VH = 0.14;
/** Subpixel epsilon so the docked transition fires just before y=S without jitter. */
const DOCKED_BOUNDARY_EPSILON_PX = 0.5;

/**
 * Drives the HomeV2 hero compress/fade and bottom-of-page fade off a single rAF-throttled
 * scroll loop. The dark-header icon toggle reads bottom-fade progress, which is why the two
 * effects share one orchestrator instead of being two independent hooks.
 */
export function useHomeV2HeroScene({
  mainRef,
  heroShellRef,
  imageWrapRef,
  gallerySectionRef,
  galleryPinRef,
}: SceneRefs) {
  useLayoutEffect(() => {
    let rafId: number | null = null;
    let metrics = { compress: 1, fade: 1, S: 2, minScale: MIN_SCALE_FALLBACK };
    let reducedMotion = false;
    let bottomFadeProgress = 0;
    // Fade target: same resolved color as `.home-v2__scroll` so the docked hero matches weekend details.
    let heroFadeTargetRgb: [number, number, number] = FALLBACK_PAGE_BG_RGB;

    const applyBottomScene = () => {
      const main = mainRef.current;
      const section = gallerySectionRef.current;
      const pin = galleryPinRef.current;
      if (!main || !section || !pin) return;

      const vh = Math.max(1, window.innerHeight);
      const rect = section.getBoundingClientRect();
      const startY = vh * BOTTOM_FADE_START_VH;
      const endY = vh * BOTTOM_FADE_END_VH;
      const progressRaw = (startY - rect.top) / Math.max(1, startY - endY);
      const progress = Math.max(0, Math.min(1, progressRaw));
      const liftPx = Math.round(vh * GALLERY_LIFT_MAX_VH * progress);

      const [baseR, baseG, baseB] = FALLBACK_PAGE_BG_RGB;
      const r = Math.round(baseR * (1 - progress));
      const g = Math.round(baseG * (1 - progress));
      const b = Math.round(baseB * (1 - progress));
      bottomFadeProgress = progress;

      main.style.setProperty('--home-v2-page-bg', `rgb(${r}, ${g}, ${b})`);
      main.style.setProperty('--home-v2-bottom-fade', progress.toFixed(3));
      pin.style.setProperty('--home-v2-gallery-lift', `${liftPx}px`);
    };

    const syncMetrics = () => {
      const vh = window.innerHeight;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotion = mq.matches;
      const compress = reducedMotion ? 0 : Math.max(1, Math.round(vh * COMPRESS_VH));
      const fade = reducedMotion ? 0 : Math.max(1, Math.round(vh * FADE_VH));
      const main = mainRef.current;
      const minScale = computeHeroMinScaleForHeader(main);
      metrics = { compress, fade, S: compress + fade, minScale };
      const sink = main?.querySelector('.home-v2__scroll-sink') as HTMLElement | null;
      if (sink) sink.style.height = `${metrics.S}px`;
      if (!main) return;
      main.classList.toggle('home-v2--reduced-motion', reducedMotion);
      const scrollSection = main.querySelector('.home-v2__scroll') as HTMLElement | null;
      heroFadeTargetRgb =
        readSolidBackgroundRgb(scrollSection) ??
        readSolidBackgroundRgb(main) ??
        FALLBACK_PAGE_BG_RGB;
    };

    const applyScroll = () => {
      const main = mainRef.current;
      const shell = heroShellRef.current;
      const wrap = imageWrapRef.current;
      if (!main || !shell || !wrap) return;

      applyBottomScene();

      const { compress, fade, S, minScale } = metrics;
      const y = Math.max(0, window.scrollY);
      main.toggleAttribute('data-home-v2-scrolled', y > 1);

      if (reducedMotion || S <= 0) {
        shell.classList.remove('home-v2__hero-shell--fixed', 'home-v2__hero-shell--docked');
        shell.classList.add('home-v2__hero-shell--flow');
        shell.style.top = '';
        shell.style.backgroundColor = '';
        shell.style.setProperty('--home-v2-name-fade', '1');
        shell.style.setProperty('--home-v2-hero-scale', '1');
        wrap.style.transform = '';
        main.toggleAttribute('data-home-v2-header-dark', true);
        return;
      }

      shell.classList.remove('home-v2__hero-shell--flow');

      const tCompress = Math.min(1, y / compress);
      const scale = 1 - (1 - minScale) * tCompress;
      const tFade = y <= compress ? 0 : Math.min(1, (y - compress) / fade);
      const released = y >= S - DOCKED_BOUNDARY_EPSILON_PX;
      // Docked slightly before y=S; snap shell fade to 1 so bg matches `.home-v2__scroll` exactly.
      const tFadeShell = released ? 1 : tFade;
      const [pr, pg, pb] = heroFadeTargetRgb;
      const r = Math.round(pr * tFadeShell);
      const g = Math.round(pg * tFadeShell);
      const b = Math.round(pb * tFadeShell);

      wrap.style.transform = `scale(${scale})`;
      shell.style.setProperty('--home-v2-name-fade', String(tFadeShell));
      shell.style.setProperty('--home-v2-hero-scale', String(scale));

      if (released) {
        shell.classList.remove('home-v2__hero-shell--fixed');
        shell.classList.add('home-v2__hero-shell--docked');
        shell.style.top = `${S}px`;
        // Hand off to CSS so the docked shell tracks --home-v2-page-bg live — matches .home-v2__scroll
        // exactly, including during the bottom-fade when the page bg darkens.
        shell.style.backgroundColor = '';
      } else {
        shell.classList.add('home-v2__hero-shell--fixed');
        shell.classList.remove('home-v2__hero-shell--docked');
        shell.style.top = '';
        shell.style.backgroundColor = `rgb(${r},${g},${b})`;
      }

      const wantsDarkHeaderIcons =
        (tFadeShell > HEADER_DARK_THRESHOLD || released) &&
        bottomFadeProgress < HEADER_DARK_THRESHOLD;
      main.toggleAttribute('data-home-v2-header-dark', wantsDarkHeaderIcons);
    };

    const onScrollOrResize = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applyScroll();
      });
    };

    const resync = () => {
      syncMetrics();
      applyScroll();
    };

    syncMetrics();
    applyScroll();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', resync);
    window.addEventListener('resize', resync);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });

    let headerWrapObserver: ResizeObserver | null = null;
    const headerWrap = mainRef.current?.querySelector('.home-v2__fixed-header-wrap');
    if (headerWrap && typeof ResizeObserver !== 'undefined') {
      headerWrapObserver = new ResizeObserver(resync);
      headerWrapObserver.observe(headerWrap);
    }

    return () => {
      mq.removeEventListener('change', resync);
      window.removeEventListener('resize', resync);
      window.removeEventListener('scroll', onScrollOrResize);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      headerWrapObserver?.disconnect();
    };
  }, [mainRef, heroShellRef, imageWrapRef, gallerySectionRef, galleryPinRef]);
}
