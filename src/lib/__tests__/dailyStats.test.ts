import { describe, expect, it } from 'vitest';
import { isStatMetric, mayMeasureReturning, statsDay, visitFromNote } from '../dailyStats.shared';

describe('statsDay', () => {
  it('is the UTC calendar day', () => {
    expect(statsDay(new Date('2026-11-20T23:59:59Z'))).toBe('2026-11-20');
    expect(statsDay(new Date('2026-11-21T00:00:00Z'))).toBe('2026-11-21');
  });
});

describe('mayMeasureReturning: no note on the device in the EEA, the UK or Switzerland', () => {
  it('allows the US and the other countries Pick serves outside Europe', () => {
    for (const c of ['US', 'CA', 'AU', 'JP', 'IN', 'us']) expect(mayMeasureReturning(c)).toBe(true);
  });

  it('refuses EU members, EEA states, the UK and Switzerland', () => {
    for (const c of ['GB', 'DE', 'FR', 'IE', 'ES', 'NO', 'IS', 'LI', 'CH', 'gb', ' fr ']) {
      expect(mayMeasureReturning(c)).toBe(false);
    }
  });

  it('no country (local development) counts as measurable', () => {
    expect(mayMeasureReturning(null)).toBe(true);
    expect(mayMeasureReturning(undefined)).toBe(true);
  });
});

describe('visitFromNote', () => {
  const today = '2026-11-20';

  it('no note: a new visitor, and the note starts today', () => {
    expect(visitFromNote(null, today)).toEqual({
      kind: 'visit_new',
      note: JSON.stringify({ first: today, last: today }),
    });
  });

  it('second page load the same day: nothing is reported and the note is untouched', () => {
    const note = JSON.stringify({ first: today, last: today });
    expect(visitFromNote(note, today)).toEqual({ kind: null, note });
  });

  it('a later day: returning, first visit kept, last visit moved forward', () => {
    const note = JSON.stringify({ first: '2026-11-13', last: '2026-11-18' });
    expect(visitFromNote(note, today)).toEqual({
      kind: 'visit_returning',
      note: JSON.stringify({ first: '2026-11-13', last: today }),
    });
  });

  it('a returning visitor is counted once a day, however many pages they open', () => {
    const first = visitFromNote(JSON.stringify({ first: '2026-11-13', last: '2026-11-18' }), today);
    expect(first.kind).toBe('visit_returning');
    expect(visitFromNote(first.note, today).kind).toBeNull();
  });

  it('a note that does not parse starts over as new', () => {
    expect(visitFromNote('{broken', today).kind).toBe('visit_new');
    expect(visitFromNote('{"first":1,"last":2}', today).kind).toBe('visit_new');
    expect(visitFromNote('{"first":"yesterday","last":"today"}', today).kind).toBe('visit_new');
  });

  it('the note holds two dates and nothing else', () => {
    expect(Object.keys(JSON.parse(visitFromNote(null, today).note))).toEqual(['first', 'last']);
  });
});

describe('isStatMetric', () => {
  it('accepts the five counted things and nothing else', () => {
    for (const m of ['visit_new', 'visit_returning', 'visit_unmeasured', 'search', 'store_click']) {
      expect(isStatMetric(m)).toBe(true);
    }
    expect(isStatMetric('pageview')).toBe(false);
    expect(isStatMetric(null)).toBe(false);
  });
});
