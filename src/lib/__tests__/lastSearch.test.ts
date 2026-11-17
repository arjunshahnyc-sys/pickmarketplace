import { describe, expect, it } from 'vitest';
import { LAST_SEARCH_TTL_MS, lastSearchKey, parseLastSearch } from '@/lib/lastSearch';

describe('lastSearchKey', () => {
  it('treats the same words, size and destination as the same search', () => {
    expect(lastSearchKey(' Oversized Hoodie ', 'letters', 'XL', 'US')).toBe(lastSearchKey('oversized hoodie', 'letters', 'XL', 'US'));
  });

  it('tells sizes and destinations apart', () => {
    const base = lastSearchKey('hoodie', 'letters', 'XL', 'US');
    expect(lastSearchKey('hoodie', 'letters', 'L', 'US')).not.toBe(base);
    expect(lastSearchKey('hoodie', null, null, 'US')).not.toBe(base);
    expect(lastSearchKey('hoodie', 'letters', 'XL', 'GB')).not.toBe(base);
  });
});

describe('parseLastSearch', () => {
  const now = 1_800_000_000_000;
  const stored = (over: object = {}) =>
    JSON.stringify({ key: 'hoodie||US', q: 'hoodie', kind: null, size: null, ts: now - 60_000, data: { results: [] }, ...over });

  it('returns a recent snapshot', () => {
    expect(parseLastSearch(stored(), now)?.q).toBe('hoodie');
  });

  it('drops one older than the server would have cached', () => {
    expect(parseLastSearch(stored({ ts: now - LAST_SEARCH_TTL_MS }), now)).toBeNull();
  });

  it('drops anything missing, broken or wrongly shaped', () => {
    expect(parseLastSearch(null, now)).toBeNull();
    expect(parseLastSearch('{oops', now)).toBeNull();
    expect(parseLastSearch(stored({ data: null }), now)).toBeNull();
    expect(parseLastSearch(JSON.stringify({ q: 'hoodie' }), now)).toBeNull();
  });
});
