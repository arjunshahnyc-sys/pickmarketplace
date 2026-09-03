import { describe, expect, it } from 'vitest';
import { discountPercent, overlaysFor, type OverlayInput } from '../cardOverlays';

const base: OverlayInput = { price: 45 };

describe('card overlay chips: one anchored stack, fixed order', () => {
  it('renders nothing for a plain listing', () => {
    expect(overlaysFor(base)).toEqual({ savings: null, tag: null });
  });

  it('a sale price yields the discount tag with the card\'s rounding', () => {
    expect(overlaysFor({ ...base, originalPrice: 60 })).toEqual({
      savings: null,
      tag: { kind: 'discount', percent: 25 },
    });
    expect(discountPercent(45, 60)).toBe(25);
    expect(discountPercent(29.99, 39.99)).toBe(25);
  });

  it('an original price at or below the price is not a markdown', () => {
    expect(overlaysFor({ ...base, originalPrice: 45 }).tag).toBeNull();
    expect(overlaysFor({ ...base, originalPrice: 40 }).tag).toBeNull();
  });

  it('the cheapest same-item listing gets the savings chip in its currency', () => {
    expect(
      overlaysFor({ ...base, currency: 'GBP', isLowestInGroup: true, groupSavingsAmount: 33 })
    ).toEqual({ savings: { kind: 'same-item', amount: 33, currency: 'GBP' }, tag: null });
  });

  it('on sale AND cheapest of its group: both chips, savings first', () => {
    const out = overlaysFor({
      ...base,
      originalPrice: 60,
      isLowestInGroup: true,
      groupSavingsAmount: 33,
    });
    expect(out.savings).toEqual({ kind: 'same-item', amount: 33, currency: undefined });
    expect(out.tag).toEqual({ kind: 'discount', percent: 25 });
  });

  it('a similar pick shows that chip and suppresses the same-item chip', () => {
    const out = overlaysFor({
      ...base,
      isLowestInGroup: true,
      groupSavingsAmount: 33,
      matchType: 'similar',
      similarTo: { name: 'Anchor', savingsPercent: 28, sharedSpecs: [] },
    });
    expect(out.savings).toEqual({ kind: 'similar', percent: 28 });
  });

  it('no same-item chip without a positive group saving', () => {
    expect(overlaysFor({ ...base, isLowestInGroup: true, groupSavingsAmount: 0 }).savings).toBeNull();
    expect(overlaysFor({ ...base, isLowestInGroup: true }).savings).toBeNull();
    expect(overlaysFor({ ...base, groupSavingsAmount: 10 }).savings).toBeNull();
  });

  it('example cards get only the EXAMPLE tag, never savings or a discount', () => {
    expect(
      overlaysFor({
        ...base,
        isFallback: true,
        originalPrice: 60,
        isLowestInGroup: true,
        groupSavingsAmount: 33,
      })
    ).toEqual({ savings: null, tag: { kind: 'example' } });
  });
});
