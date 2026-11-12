import { describe, expect, it } from 'vitest';
import { COMPARISONS, comparisonCopy, getAlternativeSearch, getComparison } from '../comparisons';

const copyOf = (slug: string) => comparisonCopy(getComparison(slug)!, 3);

describe('comparisonCopy', () => {
  it('words an electronics page the way shoppers search', () => {
    const copy = copyOf('sony-wh-1000xm5');
    expect(copy.title).toBe('Sony WH-1000XM5: cheaper alternatives and lowest price | Pick');
    expect(copy.description).toContain('cheaper alternative to the Sony WH-1000XM5');
    expect(copy.heading).toBe('Sony WH-1000XM5: lowest real price and cheaper alternatives');
    expect(copy.alternativesHeading).toBe('Cheaper alternatives to the Sony WH-1000XM5');
  });

  it('says dupe for skincare and clothing', () => {
    for (const slug of ['supergoop-unseen-sunscreen-spf-40', 'nike-club-fleece-hoodie']) {
      const entry = getComparison(slug)!;
      const copy = comparisonCopy(entry, 3);
      expect(copy.title).toContain('dupes');
      expect(copy.description).toContain(`dupe for the ${entry.name}`);
      expect(copy.alternativesHeading).toContain('Dupes');
    }
    expect(copyOf('supergoop-unseen-sunscreen-spf-40').title).toBe(
      'Supergoop Unseen Sunscreen SPF 40: dupes, cheaper alternatives and lowest price | Pick'
    );
  });

  it('promises no alternative on a page that never looks for one', () => {
    const textbooks = COMPARISONS.filter((c) => !getAlternativeSearch(c.slug));
    expect(textbooks.length).toBeGreaterThan(0);
    for (const entry of textbooks) {
      const copy = comparisonCopy(entry, 3);
      expect(copy.title).toBe(`${entry.name}: lowest price across stores | Pick`);
      expect(copy.title.toLowerCase()).not.toMatch(/alternative|dupe/);
      expect(copy.heading.toLowerCase()).not.toMatch(/alternative|dupe/);
      expect(copy.description).toContain('does not suggest a different book');
    }
  });

  it('never states a price, a saving, or that an alternative was found', () => {
    for (const entry of COMPARISONS) {
      const copy = comparisonCopy(entry, 3);
      const text = `${copy.title} ${copy.description} ${copy.heading} ${copy.alternativesHeading}`;
      // A price or percentage that is not part of the product's own name.
      const added = text.split(entry.name).join('');
      expect(added).not.toMatch(/\$\d/);
      expect(added.replace('at least 25% less', '')).not.toMatch(/\d+%/);
      if (getAlternativeSearch(entry.slug)) expect(copy.description).toContain("when one passes Pick's bar");
    }
  });

  it('gives every page a distinct title that leads with the product name', () => {
    const titles = COMPARISONS.map((c) => comparisonCopy(c, 3).title);
    expect(new Set(titles).size).toBe(COMPARISONS.length);
    for (const entry of COMPARISONS) expect(comparisonCopy(entry, 3).title.startsWith(entry.name)).toBe(true);
  });

  it('uses no em dashes', () => {
    for (const entry of COMPARISONS) {
      const copy = comparisonCopy(entry, 3);
      expect(`${copy.title}${copy.description}${copy.heading}${copy.alternativesHeading}`).not.toContain('—');
    }
  });
});
