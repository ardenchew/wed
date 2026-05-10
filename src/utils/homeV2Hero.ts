/** Scroll distance (× viewport height) before hero docks into the document and scrolls normally */
export const COMPRESS_VH = 0.5;
export const FADE_VH = 0.32;
/** When header metrics are missing, fall back to this end scale */
export const MIN_SCALE_FALLBACK = 0.8;
/** Horizontal gap (px) between scaled hero edges and logo / menu hit targets */
const HERO_CLEAR_BUFFER_PX_DESKTOP = 12;
const HERO_CLEAR_BUFFER_PX_MOBILE = 4;
/** Viewport width (px) at or below which the tighter mobile buffer applies */
const HERO_CLEAR_BUFFER_MOBILE_MAX_W = 640;
/** Do not shrink the hero below this scale if geometry is pathological */
const MIN_SCALE_ABSOLUTE_FLOOR = 0.42;

/** Matches :root --background when CSS cannot be read yet */
export const FALLBACK_PAGE_BG_RGB: [number, number, number] = [250, 250, 250];

function parseCssRgb(color: string): [number, number, number] | null {
  const m = color.trim().match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return null;
  return [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))];
}

/** Resolved solid background for an element (comma or space-separated rgb from getComputedStyle). */
export function readSolidBackgroundRgb(el: HTMLElement | null): [number, number, number] | null {
  if (!el) return null;
  const raw = getComputedStyle(el).backgroundColor;
  const comma = parseCssRgb(raw);
  if (comma) return comma;
  const m = raw
    .trim()
    .match(/rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+\s*)?\)/);
  if (!m) return null;
  return [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))];
}

/**
 * End-of-compress scale so the centered hero (full-width shell × scale) clears the logo and menu.
 * With transform-origin center: left edge at W(1−s)/2, right at W(1+s)/2.
 */
export function computeHeroMinScaleForHeader(main: HTMLElement | null): number {
  if (!main) return MIN_SCALE_FALLBACK;
  const logo = main.querySelector('.home-logo');
  const menuTrigger = main.querySelector('.home-menu__trigger');
  if (!logo || !menuTrigger) return MIN_SCALE_FALLBACK;

  const W = window.innerWidth;
  if (W <= 0) return MIN_SCALE_FALLBACK;

  const buf =
    W <= HERO_CLEAR_BUFFER_MOBILE_MAX_W ? HERO_CLEAR_BUFFER_PX_MOBILE : HERO_CLEAR_BUFFER_PX_DESKTOP;
  const leftBound = logo.getBoundingClientRect().right + buf;
  const rightBound = menuTrigger.getBoundingClientRect().left - buf;

  const fromLeft = 1 - (2 * leftBound) / W;
  const fromRight = (2 * rightBound) / W - 1;
  let s = Math.min(1, fromLeft, fromRight);

  if (!Number.isFinite(s)) return MIN_SCALE_FALLBACK;
  if (s < MIN_SCALE_ABSOLUTE_FLOOR) s = MIN_SCALE_ABSOLUTE_FLOOR;
  return s;
}
