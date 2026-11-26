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

// The Black Friday feature on the landing page (a dark band under the hero
// and a pill above the headline, both linking to /price-check/black-friday)
// runs from 2026-11-20 through Cyber Monday, 2026-11-30, and then switches
// itself off the same way: the visitor's clock, year pinned.
const SALE_START_DAY = 20;
const SALE_END_DAY = 30;

/** True from November 20 through November 30, 2026, in the given date's local time. */
export function isBlackFridayWindow(now: Date): boolean {
  if (now.getFullYear() !== HOLIDAY_YEAR || now.getMonth() + 1 !== START_MONTH) return false;
  return now.getDate() >= SALE_START_DAY && now.getDate() <= SALE_END_DAY;
}
