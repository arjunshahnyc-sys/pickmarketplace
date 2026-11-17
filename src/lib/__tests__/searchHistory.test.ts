import { describe, expect, it } from 'vitest';
import {
  SEARCH_HISTORY_LIMIT,
  matchingSearches,
  sanitizeHistory,
  withSearch,
  withoutSearch,
} from '@/lib/searchHistory';

describe('withSearch', () => {
  it('puts the newest search first', () => {
    expect(withSearch(['airpods'], 'air fryer')).toEqual(['air fryer', 'airpods']);
  });

  it('moves a repeated search to the front instead of listing it twice', () => {
    expect(withSearch(['hoodie', 'airpods', 'laptop'], 'AirPods')).toEqual(['AirPods', 'hoodie', 'laptop']);
  });

  it('tidies spacing and ignores an empty search', () => {
    expect(withSearch([], '  sony   xm6 ')).toEqual(['sony xm6']);
    expect(withSearch(['hoodie'], '   ')).toEqual(['hoodie']);
  });

  it('keeps only the most recent few', () => {
    let history: string[] = [];
    for (let i = 0; i < SEARCH_HISTORY_LIMIT + 3; i++) history = withSearch(history, `item ${i}`);
    expect(history).toHaveLength(SEARCH_HISTORY_LIMIT);
    expect(history[0]).toBe(`item ${SEARCH_HISTORY_LIMIT + 2}`);
    expect(history).not.toContain('item 0');
  });
});

describe('withoutSearch', () => {
  it('removes one entry, whatever its capitals', () => {
    expect(withoutSearch(['Hoodie', 'laptop'], 'hoodie')).toEqual(['laptop']);
  });
});

describe('matchingSearches', () => {
  it('offers everything while the box is empty', () => {
    expect(matchingSearches(['hoodie', 'laptop'], '')).toEqual(['hoodie', 'laptop']);
  });

  it('narrows to past searches containing what was typed, minus an exact match', () => {
    const history = ['air fryer', 'airpods', 'laptop'];
    expect(matchingSearches(history, 'AIR')).toEqual(['air fryer', 'airpods']);
    expect(matchingSearches(history, 'airpods')).toEqual([]);
  });
});

describe('sanitizeHistory', () => {
  it('returns nothing for missing, broken or wrongly shaped storage', () => {
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory('{not json')).toEqual([]);
    expect(sanitizeHistory('{"a":1}')).toEqual([]);
  });

  it('keeps only real, distinct searches, capped', () => {
    expect(sanitizeHistory(JSON.stringify(['hoodie', 7, '', 'HOODIE', null, ' laptop ']))).toEqual(['hoodie', 'laptop']);
    const many = Array.from({ length: 30 }, (_, i) => `item ${i}`);
    expect(sanitizeHistory(JSON.stringify(many))).toHaveLength(SEARCH_HISTORY_LIMIT);
  });
});
