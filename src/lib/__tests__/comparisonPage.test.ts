import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildComparison, formatCheckedDate, MAX_ITEM_ROWS } from '../comparisonPage';
import { COMPARISONS, comparisonsByCategory, getComparison } from '../comparisons';
import type { LiveSearchData } from '../searchService';
import type { Product } from '../types';
import sony6Fixture from './fixtures/similarPicks/sony_wh_1000xm6.json';
import spaceOneFixture from './fixtures/similarPicks/soundcore_space_one.json';

type Fixture = { results: Array<Partial<Product> & { name: string; price: number }> };

function load(fixture: Fixture): Product[] {
  // The 2026-09-02 captures carry placeholder URLs; a real URL on an
  // unrelated host would (rightly) withhold every verified badge.
  return fixture.results.map(
    (r) => ({ image: '', retailer: 'Store', ...r, url: /example\.test/.test(r.url ?? '') ? '' : (r.url ?? '') }) as Product
  );
}

const NOW = new Date('2026-09-02T12:00:00Z');

function search(results: Product[]): LiveSearchData {
  return { results, retailerSearchLinks: [], message: '', retailersFound: [], facets: [], checkedAt: NOW.toISOString() };
}

describe('the comparison catalog', () => {
  const testset = JSON.parse(readFileSync(join(process.cwd(), 'eval', 'testset.json'), 'utf8')) as {
    queries: Array<{ id: string; query: string }>;
  };

  it('tracks the eval test set: every page is a test set entry with the same query, once', () => {
    const byId = new Map(testset.queries.map((q) => [q.id, q.query]));
    for (const entry of COMPARISONS) {
      expect(byId.get(entry.evalId), entry.slug).toBe(entry.query);
    }
    expect(new Set(COMPARISONS.map((c) => c.evalId)).size).toBe(COMPARISONS.length);
    expect(COMPARISONS.length).toBe(testset.queries.length);
  });

  it('slugs are unique and URL-safe', () => {
    expect(new Set(COMPARISONS.map((c) => c.slug)).size).toBe(COMPARISONS.length);
    for (const { slug } of COMPARISONS) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(getComparison('sony-wh-1000xm6')?.query).toBe('sony wh-1000xm6');
    expect(getComparison('nope')).toBeUndefined();
  });

  it('groups by category in catalog order without losing an entry', () => {
    const groups = comparisonsByCategory();
    expect(groups.map((g) => g.category)).toEqual([
      'earbuds', 'headphones', 'skincare', 'dorm appliances', 'textbooks', 'clothing',
    ]);
    expect(groups.flatMap((g) => g.entries)).toEqual(COMPARISONS);
  });
});

describe('buildComparison', () => {
  // The landing page pair, from the two 2026-09-02 captures together: the
  // XM6 is the searched item, the Space One its cheaper twin.
  const results = [...load(sony6Fixture as Fixture), ...load(spaceOneFixture as Fixture)];
  const comparison = buildComparison(search(results), 'sony wh-1000xm6', NOW);

  it('anchors on the searched item and puts a verified store on top', () => {
    expect(comparison.item.anchorName).toBe('Sony WH-1000XM6 Wireless Noise Canceling Headphones');
    expect(comparison.item.priceBasis).toBe('verified');
    expect(comparison.item.referencePrice).toBe(458);
    expect(comparison.item.top?.trustLevel).toBe('verified');
    expect(comparison.item.top?.conditionLabel).toBeNull();
    expect(comparison.item.topIsVerifiedNew).toBe(true);
    expect(comparison.item.rows[0]).toEqual(comparison.item.top);
    expect(comparison.item.rows.length).toBeLessThanOrEqual(MAX_ITEM_ROWS);
  });

  it('rows are the searched item in cost order with item plus shipping before tax', () => {
    const costs = comparison.item.rows.map((r) => r.preTaxMinor ?? Number.MAX_SAFE_INTEGER);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    for (const row of comparison.item.rows) {
      expect(row.name.toLowerCase().replace(/[^a-z0-9]/g, '')).toContain('wh1000xm6');
      expect(row.trustLevel).not.toBe('flagged');
      if (row.shippingMinor !== null) {
        expect(row.preTaxMinor).toBe(Math.round(row.price * 100) + row.shippingMinor);
      } else {
        expect(row.preTaxMinor).toBeNull();
      }
    }
  });

  it('the twin is the first Similar pick, with the chips the matcher produces', () => {
    expect(comparison.twin?.name).toBe('Anker Soundcore Space One Wireless Noise Cancelling Headphones');
    expect(comparison.twin?.trustLevel).toBe('verified');
    expect(comparison.twin?.savingsPercent).toBe(87);
    expect(comparison.twin?.sharedSpecs).toEqual([
      'Over ear', 'Active noise canceling', 'LDAC audio', 'Bluetooth', '30+ hr battery',
    ]);
    // Both Space One listings are one item: the second is not "another" twin.
    expect(comparison.moreTwins).toEqual([]);
  });

  it('counts what it saw and keeps the stamp', () => {
    expect(comparison.checkedAt).toBe(NOW.toISOString());
    expect(comparison.listingCount).toBe(results.length);
    expect(comparison.storeCount).toBe(new Set(results.map((r) => r.retailer)).size);
  });

  it('a search with no twin says so honestly, and never fabricates a top price', () => {
    const alone = buildComparison(search(load(sony6Fixture as Fixture)), 'sony wh-1000xm6', NOW);
    expect(alone.twin).toBeNull();
    expect(alone.item.top).not.toBeNull();
    const empty = buildComparison(search([]), 'sony wh-1000xm6', NOW);
    expect(empty.item.top).toBeNull();
    expect(empty.item.rows).toEqual([]);
    expect(empty.twin).toBeNull();
    expect(empty.hasUnverifiedSeller).toBe(false);
  });

  it('formats the checked date deterministically in UTC', () => {
    expect(formatCheckedDate('2026-10-27T23:30:00Z')).toBe('Oct 27, 2026');
    expect(formatCheckedDate('2026-01-01T00:00:00Z')).toBe('Jan 1, 2026');
  });
});
