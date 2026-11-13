// The same picture as opengraph-image.tsx, for platforms that read the
// twitter:image tag. The config exports are repeated because Next reads
// them from this file statically.
export { default } from './opengraph-image';

export const alt = 'The lowest confirmed price and a cheaper alternative, from Pick';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 259200;
