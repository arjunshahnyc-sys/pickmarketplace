import { describe, expect, it } from 'vitest';
import {
  isValidSize,
  namesAnotherSize,
  sanitizeStoredSizes,
  sizeKindForQuery,
  sizeKindForResults,
  sizeNamedInTitle,
  sizeVerdict,
  withSize,
} from '@/lib/sizeSearch';

describe('sizeKindForQuery', () => {
  it('offers letter sizes for clothes', () => {
    for (const q of ['oversized hoodie', 'Mini Dresses', 'carhartt t-shirt', 'nike fleece joggers', 'crop top']) {
      expect(sizeKindForQuery(q), q).toBe('letters');
    }
  });

  it('offers shoe sizes for footwear, including dress shoes', () => {
    for (const q of ['running shoes', 'mens dress shoes', 'nike air force 1', 'ugg boots']) {
      expect(sizeKindForQuery(q), q).toBe('shoes');
    }
  });

  it('offers waist sizes for jeans', () => {
    expect(sizeKindForQuery("levi's 501 jeans")).toBe('waist');
  });

  it('offers nothing for things that are not worn', () => {
    for (const q of ['airpods', 'laptop', 'air fryer', 'top rated blender', 'desk lamp', 'stanley tumbler', 'textbooks']) {
      expect(sizeKindForQuery(q), q).toBeNull();
    }
  });

  it('steps aside when the shopper typed a size', () => {
    for (const q of ['hoodie size m', 'oversized hoodie xl', 'levis 501 jeans 32x30', 'large dog sweater']) {
      expect(sizeKindForQuery(q), q).toBeNull();
    }
  });
});

describe('sizeKindForResults', () => {
  const hoodies = ['Gap Logo Fleece Hoodie', 'UNIQLO Sweat Pullover Hoodie', 'H&M Loose Fit Hoodie', 'Gymshark Crest Hoodie', 'Stanley Tumbler'];

  it('reads the kind off the listings when the search words do not say', () => {
    expect(sizeKindForResults('gymshark crest', hoodies)).toBe('letters');
  });

  it('wants a clear majority and enough listings', () => {
    expect(sizeKindForResults('gift ideas', ['Gap Hoodie', 'Air Fryer', 'Desk Lamp', 'Tumbler'])).toBeNull();
    expect(sizeKindForResults('gymshark', hoodies.slice(0, 2))).toBeNull();
  });

  it('steps aside when the shopper typed a size', () => {
    expect(sizeKindForResults('gymshark crest xl', hoodies)).toBeNull();
  });
});

describe('withSize', () => {
  it('adds the size the way the price source understands it', () => {
    expect(withSize(' oversized hoodie ', 'XL')).toBe('oversized hoodie size XL');
    expect(withSize('nike air force 1 mens', '10.5')).toBe('nike air force 1 mens size 10.5');
  });
});

describe('sizeNamedInTitle', () => {
  it('reads letter sizes, spelled out or not', () => {
    expect(sizeNamedInTitle("Women's Feel Good Oversized Hoodie in Dark Blue Size L from Hollister", 'letters')).toBe('L');
    expect(sizeNamedInTitle('Fleece Core Washed Pullover Hoodie in Navy - Size Medium', 'letters')).toBe('M');
    expect(sizeNamedInTitle('Heavyweight Oversized Hoodie by Gap True Black Size XL', 'letters')).toBe('XL');
  });

  it('treats another size system as a size that is not ours', () => {
    expect(sizeNamedInTitle('Old Navy Bubble-Hem Hoodie - Gray - Plus Size 2X', 'letters')).toBe('XXL');
    expect(sizeNamedInTitle('Girls Hoodie Size 12', 'letters')).toBe('12');
    expect(sizeNamedInTitle("Men's Adult Heavyweight Oversized Hoodie by Gap Birch Size XXXL", 'letters')).toBe('XXXL');
  });

  it('reads a size left at the end of the title', () => {
    expect(sizeNamedInTitle('Essential Oversized Hoodie - Stone, XS', 'letters')).toBe('XS');
    expect(sizeNamedInTitle('Crest Hoodie - Black - XL', 'letters')).toBe('XL');
    expect(sizeNamedInTitle('Oversized Hoodie - Vitamin C', 'letters')).toBeNull();
  });

  it('reads shoe sizes with halves', () => {
    expect(sizeNamedInTitle("Nike Men's Air Force 1 '07 Shoes, Size 10.5, White", 'shoes')).toBe('10.5');
    expect(sizeNamedInTitle("Nike Men's Air Force 1 '07 Shoes, Size 11, Black Shiny", 'shoes')).toBe('11');
  });

  it('reads the waist from waist x length', () => {
    expect(sizeNamedInTitle("Levi's 501 Jeans Men 32x30 Blue Straight Leg", 'waist')).toBe('32');
    expect(sizeNamedInTitle("Levi's Mens 34 X 30 501 Button Fly", 'waist')).toBe('34');
  });

  it('returns nothing for the usual title that names no size', () => {
    expect(sizeNamedInTitle('UNIQLO Sweat Oversized Pullover Hoodie', 'letters')).toBeNull();
    expect(sizeNamedInTitle('Oversized Hoodie, Size Inclusive Fit', 'letters')).toBeNull();
    expect(sizeNamedInTitle("Nike Men's Air Force 1 '07", 'shoes')).toBeNull();
  });
});

describe('namesAnotherSize', () => {
  it('drops only listings that commit to a different size', () => {
    expect(namesAnotherSize("Air Force 1 '07 Shoes, Size 11, Black", 'shoes', '10.5')).toBe(true);
    expect(namesAnotherSize("Air Force 1 '07 Shoes, Size 10.5, White", 'shoes', '10.5')).toBe(false);
    expect(namesAnotherSize("Nike Men's Air Force 1 '07", 'shoes', '10.5')).toBe(false);
  });
});

describe('stored sizes', () => {
  it('keeps only sizes the picker offers', () => {
    expect(sanitizeStoredSizes(JSON.stringify({ letters: 'M', shoes: '99', waist: 32, hats: 'L' }))).toEqual({ letters: 'M' });
    expect(sanitizeStoredSizes('not json')).toEqual({});
    expect(sanitizeStoredSizes(null)).toEqual({});
  });

  it('validates per kind', () => {
    expect(isValidSize('shoes', '10.5')).toBe(true);
    expect(isValidSize('shoes', '13.5')).toBe(false);
    expect(isValidSize('letters', '10.5')).toBe(false);
  });
});

describe('sizeVerdict', () => {
  const isGap = (source: string) => source === 'Gap';
  const inStock = ['In stock online', '30-day returns'];

  it('confirms the size when the store names it and it is in stock', () => {
    const offers = [{ source: 'Gap', title: 'Heavyweight Oversized Hoodie by Gap True Black Size XL', details: inStock }];
    expect(sizeVerdict(offers, isGap, 'letters', 'XL')).toEqual({ status: 'in-stock', alsoAt: [] });
  });

  it('says so when the size is out of stock, and where else has it', () => {
    const offers = [
      { source: 'Gap', title: 'Hoodie Size XL', details: ['Out of stock online'] },
      { source: 'Gap Factory', title: 'Hoodie Size XL', details: inStock },
      { source: 'Depop', title: 'Hoodie Size L', details: inStock },
    ];
    expect(sizeVerdict(offers, isGap, 'letters', 'XL')).toEqual({ status: 'out-of-stock', alsoAt: ['Gap Factory'] });
  });

  it('does not claim stock the lookup did not state', () => {
    expect(sizeVerdict([{ source: 'Gap', title: 'Hoodie Size XL', details: ['Free delivery'] }], isGap, 'letters', 'XL').status).toBe('listed');
  });

  it('flags a listing that is for another size', () => {
    const offers = [{ source: 'Gap', title: 'Hoodie in Dark Blue Size L', details: inStock }];
    expect(sizeVerdict(offers, isGap, 'letters', 'XL')).toEqual({ status: 'other-size', otherSize: 'L', alsoAt: [] });
  });

  it('prefers the listing in the asked size when the store has several', () => {
    const offers = [
      { source: 'Gap', title: 'Hoodie Size L', details: inStock },
      { source: 'Gap', title: 'Hoodie Size XL', details: inStock },
    ];
    expect(sizeVerdict(offers, isGap, 'letters', 'XL').status).toBe('in-stock');
  });

  it('admits when the store names no size or is not in the list', () => {
    expect(sizeVerdict([{ source: 'Gap', title: 'Logo Fleece Hoodie', details: inStock }], isGap, 'letters', 'XL').status).toBe('unstated');
    expect(sizeVerdict([{ source: 'Depop', title: 'Hoodie Size XL', details: inStock }], isGap, 'letters', 'XL')).toEqual({ status: 'unknown', alsoAt: ['Depop'] });
    expect(sizeVerdict([], isGap, 'shoes', '10.5')).toEqual({ status: 'unknown', alsoAt: [] });
  });
});
