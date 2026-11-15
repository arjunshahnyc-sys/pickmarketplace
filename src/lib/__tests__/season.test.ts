import { describe, expect, it } from 'vitest';
import { isHolidaySeason } from '@/lib/season';

// Dates are built with the local-time constructor (month is zero-based), the
// same clock the check reads, so these hold in any time zone.
describe('isHolidaySeason', () => {
  it('is off before November 15', () => {
    expect(isHolidaySeason(new Date(2026, 10, 14, 23, 59))).toBe(false);
    expect(isHolidaySeason(new Date(2026, 9, 31))).toBe(false);
  });

  it('is on from November 15 through the last minute of December 31', () => {
    expect(isHolidaySeason(new Date(2026, 10, 15, 0, 0))).toBe(true);
    expect(isHolidaySeason(new Date(2026, 10, 30))).toBe(true);
    expect(isHolidaySeason(new Date(2026, 11, 1))).toBe(true);
    expect(isHolidaySeason(new Date(2026, 11, 31, 23, 59, 59))).toBe(true);
  });

  it('is off from January 1', () => {
    expect(isHolidaySeason(new Date(2027, 0, 1, 0, 0))).toBe(false);
  });

  it('does not come back on its own the next year', () => {
    expect(isHolidaySeason(new Date(2027, 11, 20))).toBe(false);
    expect(isHolidaySeason(new Date(2025, 11, 20))).toBe(false);
  });
});
