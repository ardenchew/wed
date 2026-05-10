/**
 * Cloudinary URL builder.
 *
 * Images live at https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<public_id>
 * where `<transforms>` is a comma-separated list (e.g. `f_auto,q_auto,w_800,c_limit`).
 *
 * `f_auto` serves AVIF/WebP/JPEG based on the browser's Accept header.
 * `q_auto` picks a content-aware quality level.
 * `dpr_auto` reads client hints to serve 2× to retina screens.
 *
 * In dev (no env), returns the raw publicId so missing config is loud.
 */

type Crop = 'fill' | 'fit' | 'limit';
type Quality = 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;

export interface CloudinaryOpts {
  w?: number;
  h?: number;
  c?: Crop;
  q?: Quality;
  dpr?: 'auto' | number;
}

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

export function cloudinaryUrl(publicId: string, opts: CloudinaryOpts = {}): string {
  if (!CLOUD) return publicId;
  const t: string[] = ['f_auto', `q_${opts.q ?? 'auto'}`, `dpr_${opts.dpr ?? 'auto'}`];
  if (opts.w) t.push(`w_${opts.w}`);
  if (opts.h) t.push(`h_${opts.h}`);
  if (opts.c) t.push(`c_${opts.c}`);
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t.join(',')}/${publicId}`;
}

/** Build a srcSet string covering common DPRs / breakpoints. */
export function cloudinarySrcSet(
  publicId: string,
  widths: number[] = [480, 768, 1200, 1800],
  quality?: Quality,
): string {
  return widths
    .map((w) => `${cloudinaryUrl(publicId, { w, c: 'limit', q: quality })} ${w}w`)
    .join(', ');
}

/**
 * Heuristic: anything starting with `wed/` is a Cloudinary public_id, anything else
 * (e.g. `/placeholder_event.svg`) is a local public asset path.
 */
export const isCloudinaryId = (value: string): boolean => value.startsWith('wed/');
