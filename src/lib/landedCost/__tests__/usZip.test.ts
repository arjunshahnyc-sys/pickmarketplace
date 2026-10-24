import { describe, expect, it } from 'vitest';
import { US_STATE_CODES } from '../rules/usSalesTax';
import { isContiguousUs, normalizeZip, resolveZip, zipTableStateCodes } from '../usZip';

describe('normalizeZip', () => {
  it('accepts five digits, trims, and drops a +4', () => {
    expect(normalizeZip('30318')).toBe('30318');
    expect(normalizeZip(' 30318 ')).toBe('30318');
    expect(normalizeZip('30318-1234')).toBe('30318');
  });

  it('rejects anything else, never guessing', () => {
    for (const bad of ['', '1234', '123456', 'abcde', '30318-12', '3031 8', '3O318']) {
      expect(normalizeZip(bad), bad).toBeNull();
    }
  });
});

describe('resolveZip', () => {
  const states: Array<[string, string]> = [
    ['30318', 'GA'],
    ['10001', 'NY'],
    ['90210', 'CA'],
    ['60601', 'IL'],
    ['02134', 'MA'],
    ['03801', 'NH'],
    ['04101', 'ME'],
    ['05401', 'VT'],
    ['19901', 'DE'],
    ['21201', 'MD'],
    ['21801', 'MD'],
    // The irregular prefixes, each checked against the sectional center list.
    ['00501', 'NY'], // Holtsville
    ['05501', 'MA'], // Andover
    ['06390', 'NY'], // Fishers Island, inside Connecticut's block
    ['20001', 'DC'],
    ['20101', 'VA'], // Dulles
    ['56901', 'DC'], // Parcel Return Service
    ['39901', 'GA'], // Atlanta IRS
    ['73301', 'TX'], // Austin IRS, inside Oklahoma's block
    ['88510', 'TX'], // El Paso, inside New Mexico's block
    ['75501', 'TX'],
    ['75502', 'AR'], // Texarkana AR, inside a Texas prefix
    ['73942', 'OK'], // sorted in Amarillo TX, addresses in Oklahoma
    ['98660', 'WA'], // sorted in Portland OR
    ['86503', 'AZ'], // sorted in Albuquerque NM
    ['29715', 'SC'], // sorted in Charlotte NC
    ['96150', 'CA'], // sorted in Reno NV
    ['26836', 'WV'],
    ['71801', 'AR'],
    ['88001', 'NM'],
    ['81301', 'CO'],
    ['67901', 'KS'],
    ['99501', 'AK'],
    ['96701', 'HI'],
  ];

  it('maps ZIPs to the state of the address, including the cross-state prefixes', () => {
    for (const [zip, state] of states) {
      expect(resolveZip(zip), zip).toEqual({ kind: 'state', code: state });
    }
  });

  it('tells territories and military addresses apart from states', () => {
    expect(resolveZip('00901')).toEqual({ kind: 'territory', code: 'PR' });
    expect(resolveZip('00801')).toEqual({ kind: 'territory', code: 'VI' });
    expect(resolveZip('96910')).toEqual({ kind: 'territory', code: 'GU' });
    expect(resolveZip('96799')).toEqual({ kind: 'territory', code: 'AS' });
    expect(resolveZip('09001')).toEqual({ kind: 'military', code: 'AE' });
    expect(resolveZip('34001')).toEqual({ kind: 'military', code: 'AA' });
    expect(resolveZip('96201')).toEqual({ kind: 'military', code: 'AP' });
  });

  it('unassigned prefixes resolve to nothing, never a neighbor', () => {
    const unassigned = [
      '00000', '00401', '09901', '21301', '26901', '34301', '35301', '42901',
      '73201', '81701', '86601', '89901',
    ];
    for (const zip of unassigned) {
      expect(resolveZip(zip), zip).toEqual({ kind: 'unassigned' });
    }
  });

  it('non-ZIP input is null, distinct from an unassigned prefix', () => {
    expect(resolveZip('abc')).toBeNull();
    expect(resolveZip('')).toBeNull();
    expect(resolveZip('3031')).toBeNull();
  });

  it('reaches every state with a sales-tax row, and nothing that lacks one', () => {
    expect(zipTableStateCodes().sort()).toEqual([...US_STATE_CODES].sort());
  });
});

describe('isContiguousUs', () => {
  it('only Alaska and Hawaii are non-contiguous; DC counts as contiguous', () => {
    expect(isContiguousUs('AK')).toBe(false);
    expect(isContiguousUs('HI')).toBe(false);
    expect(isContiguousUs('hi')).toBe(false);
    for (const state of ['DC', 'CA', 'NY', 'WA', 'FL']) {
      expect(isContiguousUs(state), state).toBe(true);
    }
  });
});
