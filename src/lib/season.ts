// The holiday look (lights under the header, snowflakes and a gift line in
// the landing hero, a line in the footer) runs from 2026-11-15
// through 2026-12-31 and then switches itself off.
//
// The check runs in the visitor's browser against their own clock
// (HolidayTheme.tsx), not on the server: most pages are prerendered or
// cached for days, so a server-side check would keep serving December's
// markup into January until the next deploy. Nothing needs to be removed or
// redeployed on January 1.
//
// The year is pinned on purpose. Next season is a decision to make then,
// not something that should come back on its own.
const HOLIDAY_YEAR = 2026;
const START_MONTH = 11; // November
const START_DAY = 15;

/** True from November 15 through December 31, 2026, in the given date's local time. */
export function isHolidaySeason(now: Date): boolean {
  if (now.getFullYear() !== HOLIDAY_YEAR) return false;
  const month = now.getMonth() + 1;
  if (month === 12) return true;
  return month === START_MONTH && now.getDate() >= START_DAY;
}
