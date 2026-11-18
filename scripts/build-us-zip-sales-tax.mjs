// Builds ZIP-level combined sales tax rates (state + county + city +
// special districts) from the OFFICIAL Streamlined Sales Tax rate and
// boundary files that member states publish and certify:
//   https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files
//
// For every 5-digit ZIP it records the MOST COMMON, LOWEST and HIGHEST
// combined rate among the address ranges the state's boundary file places
// in that ZIP, as of the run date. Nothing is estimated or averaged: every figure is a sum of
// the state's own published jurisdiction rates.
//
// Usage:  node scripts/build-us-zip-sales-tax.mjs [STATE ...]
// Needs `unzip` and `curl` on the PATH. Downloads to a temp directory
// (boundary files are large: Georgia's is 316 MB unzipped) and writes
//   public/salestax/us.json  (all states in one file)
//
// FILE FORMAT (SST Rates and Boundary Databases Instructional Paper):
//   Rate row:     stateFIPS, jurisdictionType, jurisdictionCode,
//                 generalRateIntrastate, generalRateInterstate,
//                 foodDrugIntra, foodDrugInter, beginDate, endDate
//                 (type 45 = state, 00 = county, 01 = city, others =
//                 special districts)
//   Boundary row: recordType (A address range, 4 ZIP+4 range, Z ZIP5
//                 range), beginDate, endDate, ...address fields...,
//                 [15] ZIP, [17] ZIP low, [19] ZIP high, [22] state FIPS,
//                 [24] county FIPS, [25] place FIPS, then from [29] up to
//                 20 special districts as (source, code, type) triplets.

import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createReadStream, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'https://www.streamlinedsalestax.org/ratesandboundry';
const OUT_FILE = new URL('../public/salestax/us.json', import.meta.url).pathname;
const WORK = join(tmpdir(), 'pick-sst');
const TODAY = new Date().toISOString().slice(0, 10).replace(/-/g, '');
// Files older than this are not current enough to publish rates from. The
// states behind them (IN, KY, MI, NJ, RI) levy one statewide rate with no
// local add-ons, so the state base rate is already their exact rate.
const MIN_FILE_YEAR = 2025;

mkdirSync(WORK, { recursive: true });
mkdirSync(new URL('../public/salestax/', import.meta.url).pathname, { recursive: true });

const curl = (url, dest) =>
  execFileSync('curl', ['-sS', '-L', '-m', '900', '-A', 'Mozilla/5.0', '-o', dest, url]);

function listing(dir) {
  const dest = join(WORK, `${dir}.html`);
  curl(`${BASE}/${dir}/`, dest);
  const html = readFileSync(dest, 'utf8');
  const files = {};
  for (const m of html.matchAll(/HREF="\/ratesandboundry\/[^"]+\/(([A-Z]{2})[RB](\d{4})Q\d[^"]*\.(?:csv|zip|CSV))"/gi)) {
    files[m[2].toUpperCase()] = { name: m[1], year: Number(m[3]) };
  }
  return files;
}

function splitCsv(line) {
  if (line.charCodeAt(0) === 0xfeff) line = line.slice(1); // some files start with a BOM
  if (!line.includes('"')) return line.split(',');
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function lines(path) {
  const isZip = /\.zip$/i.test(path);
  const stream = isZip
    ? spawn('unzip', ['-p', path], { stdio: ['ignore', 'pipe', 'inherit'] }).stdout
    : createReadStream(path);
  return createInterface({ input: stream, crlfDelay: Infinity });
}

const inForce = (begin, end) => begin <= TODAY && TODAY <= end;
/** Jurisdiction type as two digits: states write county as "00" or "0". */
const kind = (raw) => String(raw ?? '').trim().padStart(2, '0');
/** "0.0775" -> 7750 deci-basis-points, by string so no float rounding. */
function deciBps(rate) {
  const [whole, frac = ''] = String(rate).trim().split('.');
  return Number(whole || '0') * 100_000 + Number((frac + '00000').slice(0, 5));
}

async function build(state, rateFile, boundaryFile) {
  const ratePath = join(WORK, rateFile.name);
  const boundaryPath = join(WORK, boundaryFile.name);
  if (!existsSync(ratePath)) curl(`${BASE}/Rates/${rateFile.name}`, ratePath);
  if (!existsSync(boundaryPath)) curl(`${BASE}/Boundary/${boundaryFile.name}`, boundaryPath);

  // jurisdiction (type:code) -> general intrastate rate in force today
  const rates = new Map();
  for await (const line of lines(ratePath)) {
    const f = splitCsv(line);
    if (f.length < 9 || !/^\d+$/.test(f[0])) continue;
    if (!inForce(f[7].trim(), f[8].trim())) continue;
    rates.set(`${kind(f[1])}:${f[2].trim()}`, deciBps(f[3]));
  }
  const stateRate = [...rates.entries()].find(([k]) => k.startsWith('45:'))?.[1];
  if (stateRate === undefined) throw new Error(`${state}: no state (type 45) rate in force`);

  const zips = new Map(); // zip -> Map(rate -> address-range rows at that rate)
  const zipLevel = new Map(); // zip -> rate from the state's own ZIP5 record
  const cache = new Map(); // jurisdiction signature -> combined rate
  let rows = 0;
  let unknownDistricts = 0;
  let unknownCounties = 0;
  let unknownPlaces = 0;
  for await (const line of lines(boundaryPath)) {
    const f = splitCsv(line);
    const type = f[0];
    if (type !== 'A' && type !== '4' && type !== 'Z') continue;
    if (!inForce(f[1], f[2])) continue;
    const sig = f.slice(22).join(',');
    let rate = cache.get(sig);
    if (rate === undefined) {
      rate = stateRate;
      // A county or place with no rate row levies no tax of its own (most
      // places do not); counted so a format mismatch would show up.
      const county = (f[24] ?? '').trim();
      if (county) {
        const r = rates.get(`00:${county}`);
        if (r === undefined) unknownCounties += 1;
        else rate += r;
      }
      const place = (f[25] ?? '').trim();
      if (place) {
        const r = rates.get(`01:${place}`);
        if (r === undefined) unknownPlaces += 1;
        else rate += r;
      }
      for (let i = 29; i + 2 < f.length; i += 3) {
        const code = (f[i + 1] ?? '').trim();
        if (!code) continue;
        const r = rates.get(`${kind(f[i + 2])}:${code}`);
        if (r === undefined) unknownDistricts += 1;
        else rate += r;
      }
      cache.set(sig, rate);
    }
    rows += 1;
    const lo = type === 'A' ? f[15] : f[17];
    const hi = type === 'A' ? f[15] : f[19] || f[17];
    if (!/^\d{5}$/.test(lo) || !/^\d{5}$/.test(hi)) continue;
    // A ZIP5 range record can span several ZIPs; address and ZIP+4 records
    // name one.
    const span = Number(hi) - Number(lo);
    if (span < 0 || span > 2000) continue;
    for (let z = Number(lo); z <= Number(hi); z += 1) {
      const zip = String(z).padStart(5, '0');
      if (type === 'Z') {
        zipLevel.set(zip, rate);
        continue;
      }
      let counts = zips.get(zip);
      if (!counts) zips.set(zip, (counts = new Map()));
      counts.set(rate, (counts.get(rate) ?? 0) + 1);
    }
  }
  // Per ZIP: [most common, lowest, highest]. "Most common" is the rate on
  // the most address-range rows in the state's file (ties go to the lower
  // rate). A ZIP the file covers only with a ZIP5 record carries that one
  // rate three times.
  const table = new Map();
  for (const [zip, counts] of zips) {
    const ratesSeen = [...counts.keys()].sort((a, b) => a - b);
    let common = ratesSeen[0];
    for (const r of ratesSeen) if (counts.get(r) > counts.get(common)) common = r;
    table.set(zip, [common, ratesSeen[0], ratesSeen[ratesSeen.length - 1]]);
  }
  for (const [zip, rate] of zipLevel) if (!table.has(zip)) table.set(zip, [rate, rate, rate]);
  const sorted = Object.fromEntries([...table.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const out = {
    rateFile: rateFile.name,
    boundaryFile: boundaryFile.name,
    asOf: `${TODAY.slice(0, 4)}-${TODAY.slice(4, 6)}-${TODAY.slice(6)}`,
    stateRate,
    zips: sorted,
  };
  const multi = [...table.values()].filter(([, lo, hi]) => lo !== hi).length;
  console.log(
    `${state}: ${table.size} ZIPs (${multi} with more than one rate), ${rows} boundary rows in force, ` +
      `${rates.size} rates; jurisdiction signatures without a rate row: ${unknownCounties} county, ` +
      `${unknownPlaces} place, ${unknownDistricts} district (of ${cache.size})`
  );
  return out;
}

// One file for every state, so the browser's request for it says nothing
// about where the shopper lives. A run for some states keeps the others.
const combined = existsSync(OUT_FILE)
  ? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
  : {
      unit: 'deci-basis-points (7.75% = 7750)',
      columns: ['most common rate', 'lowest rate', 'highest rate'],
      source: 'Streamlined Sales Tax rate and boundary files, published by each state',
      sourceUrl: 'https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files',
      states: {},
    };
const rateFiles = listing('Rates');
const boundaryFiles = listing('Boundary');
const wanted = process.argv.slice(2).map((s) => s.toUpperCase());
for (const state of Object.keys(rateFiles).sort()) {
  if (wanted.length && !wanted.includes(state)) continue;
  const r = rateFiles[state];
  const b = boundaryFiles[state];
  if (!b) {
    console.log(`${state}: no boundary file, skipped`);
    continue;
  }
  if (r.year < MIN_FILE_YEAR || b.year < MIN_FILE_YEAR) {
    console.log(`${state}: files are from ${Math.min(r.year, b.year)}, skipped`);
    continue;
  }
  try {
    combined.states[state] = await build(state, r, b);
  } catch (err) {
    console.log(`${state}: FAILED ${err.message}`);
  }
}
writeFileSync(OUT_FILE, JSON.stringify(combined));
console.log(`wrote ${OUT_FILE}: ${Object.keys(combined.states).length} states`);
