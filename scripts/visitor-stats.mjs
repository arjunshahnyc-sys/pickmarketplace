// Prints Pick's daily usage counts: new visits, returning visits, searches
// and clicks through to stores (what is counted: src/lib/dailyStats.shared.ts).
//
// Usage:  node --env-file=.env.local scripts/visitor-stats.mjs [days]
// Reads only. `days` defaults to 14.

import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/visitor-stats.mjs');
  process.exit(1);
}
const days = Math.max(1, Math.min(365, Number(process.argv[2]) || 14));
const sql = neon(url);
const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
const rows = await sql`SELECT "day", "metric", "count" FROM "DailyStat" WHERE "day" >= ${since} ORDER BY "day"`;

const byDay = new Map();
for (const r of rows) {
  if (!byDay.has(r.day)) byDay.set(r.day, {});
  byDay.get(r.day)[r.metric] = r.count;
}
const cols = [
  ['visit_new', 'new'],
  ['visit_returning', 'returning'],
  ['visit_unmeasured', 'unmeasured'],
  ['search', 'searches'],
  ['store_click', 'store clicks'],
];
const pad = (v, n) => String(v).padStart(n);
console.log(`day         ${cols.map(([, label]) => pad(label, 13)).join('')}   returning share`);
const total = Object.fromEntries(cols.map(([k]) => [k, 0]));
for (const [day, m] of byDay) {
  for (const [k] of cols) total[k] += m[k] ?? 0;
  const known = (m.visit_new ?? 0) + (m.visit_returning ?? 0);
  const share = known > 0 ? `${Math.round(((m.visit_returning ?? 0) / known) * 100)}%` : '-';
  console.log(`${day}  ${cols.map(([k]) => pad(m[k] ?? 0, 13)).join('')}   ${pad(share, 6)}`);
}
const known = total.visit_new + total.visit_returning;
console.log(
  `total       ${cols.map(([k]) => pad(total[k], 13)).join('')}   ${pad(known > 0 ? `${Math.round((total.visit_returning / known) * 100)}%` : '-', 6)}`
);
if (byDay.size === 0) console.log(`(no counts in the last ${days} days)`);
