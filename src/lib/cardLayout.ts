// Layout constants shared by the results grids, the product card, and the
// loading skeleton, so the three can never drift apart: the skeleton
// occupies exactly the cells the cards will, and both result pages (the
// client home page and the ISR category page) lay cards out identically.

/** The results grid on both routes: 2 / 3 / 4 columns. */
export const RESULTS_GRID_CLASS = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

/**
 * The product image box: a fixed square with a neutral pad, so every card's
 * image area is the same size whatever the photo's dimensions; the <img>
 * inside uses object-contain. Chips and the Save/Compare controls are
 * absolutely positioned against it.
 */
export const IMAGE_BOX_CLASS = 'relative aspect-square rounded-xl overflow-hidden bg-gray-100 p-4';
