import { describe, expect, it } from 'vitest';
import { IMAGE_BOX_CLASS, RESULTS_GRID_CLASS } from '../cardLayout';

// The pins that keep card, skeleton, and both grids in step.
describe('card layout constants', () => {
  it('the results grid is 2 / 3 / 4 columns with the same gap on both routes', () => {
    expect(RESULTS_GRID_CLASS).toBe('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4');
  });

  it('the image box is a fixed, padded, neutral square that clips overlays', () => {
    for (const cls of ['relative', 'aspect-square', 'overflow-hidden', 'bg-gray-100', 'p-4']) {
      expect(IMAGE_BOX_CLASS.split(' ')).toContain(cls);
    }
  });
});
