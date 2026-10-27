# Price-finding evaluation harness

Measures how close Pick gets to the lowest real price for a product, for the exact item and for its cheaper twin, against prices you find by hand. It lives entirely in `eval/` and never affects live users: it imports Pick's search, ranking and grouping modules read-only, never starts the web server, and writes only under `eval/runs/` (gitignored).

## Run it

From the repo root:

```bash
npx tsx eval/run.ts --live --yes
```

Captures a fresh run: every query in `testset.json` goes through Pick's real pipeline (`performLiveSearch`, then the homepage's landed-cost sort and same-item/similar-pick grouping), the raw source responses are saved in `eval/runs/<timestamp>/snapshots/`, and the reports are written next to them. Each query costs **2 Serper credits** (100 for the full set, per Serper's own response), the same call a shopper's search makes. (Captures before 2026-10-03 also recorded a request to Target's internal endpoint, since removed from Pick; replays ignore it.) Without `--yes` it only prints the cost.

```bash
npx tsx eval/run.ts --replay latest
```

Re-scores the newest capture from its snapshots: free, offline, no API calls. Run this after filling in benchmarks or twin lists. Because replay runs Pick's current code on the saved responses, it is also how to compare a matching or ranking change before and after on exactly the same listings (write the "after" somewhere else with `--out eval/runs/<id>/after`).

```bash
npx tsx eval/audit.ts
```

Audits the newest capture (also free): where Pick loses the lowest price across matching, variants, bundles, condition, total cost, freshness, seller trust, coverage and twins, with examples, written to `audit.md` and `audit.json` in the run folder. Run it again after a fix to see the numbers move.

Other options: `--only id1,id2`, `--run <dir>` (add or refresh entries in an existing capture), `--state XX` (override the shopper's US state), `--testset <path>`. Harness self-checks: `npx tsx eval/selftest.ts`.

`tsx` is already in `node_modules` (it comes in with the `vercel` dev dependency); nothing new was installed.

## Fill in the test set

Each entry in `testset.json` has:

- `benchmark.totalPrice`: the lowest price you can find for **one new unit** of `exactItem`, **item + shipping, before sales tax**. Or fill `itemPrice` and `shipping` and leave `totalPrice` null; the harness adds them. Use the shipping a shopper with no membership pays (no Prime, Walmart+ or Target Circle 360); Pick's shipping figures use the same guest tier.
- `benchmark.store`: the store as the site names it (Best Buy, Walmart, Amazon). Used to tell "Pick never saw this store's price" from "Pick had it but did not count it".
- `benchmark.checkedOn`: `YYYY-MM-DD`. Prices move; the report shows the days between the capture and your check. Benchmarking the same day as a capture gives the cleanest comparison.
- `benchmark.url`, `benchmark.notes`: optional.
- `acceptableTwins`: `null` until you review it; `[]` if no twin is acceptable; otherwise names (`"Soundcore Space One"`: every word must appear in the listing name) or rules (`{"all": ["space one"], "none": ["pro"]}`).

`exactItem.match` decides which listing names count as the exact item. `all` entries must all appear (a list means any one of them), `none` terms must not, and `variant` pins a size, edition or generation. Terms with digits ignore spacing and punctuation (`wh-1000xm5` matches `WH1000XM5/B`) but never match inside a longer number; other terms match whole words (`mens` never matches `womens`). A brand's own store can supply the brand word, since Uniqlo's titles leave out "Uniqlo". Edit any rule that pins something you would not.

## What the report says

Per run: `summary.md` (metrics, per-category table, every query), `report.csv` (one row per query), `listings.csv` (every listing Pick returned, with the harness's verdict on each), `results.json` (everything).

**Like-for-like** listings are the ones a new-item benchmark can fairly be compared with: the exact item by its rule, not a different stated size, edition or generation, new, one unit, not custom or promotional, and not labeled Possible scam. A title that does not state the pinned size or edition still counts, marked "size/edition not stated", because Pick shows it as the item and a shopper cannot tell either.

Condition comes from the title, then the kind of store, because Pick's feed has no condition field: resale, auction and consignment stores (Poshmark, Mercari, Whatnot, ThriftBooks, AbeBooks, pawn shops) are `resale`; lease-to-own stores (Rent-A-Center) list a payment, not a price; e-textbook stores (VitalSource) sell a digital copy. General marketplaces such as eBay are taken at their title's word.

**Pick's cheapest exact listing** is the first like-for-like listing in Pick's default sort (Total cost: Low to High), which puts the listings Pick can total first, cheapest first. It is the lowest price Pick actually presents for the item. The report also shows the **cheapest anywhere** in Pick's results as a diagnostic; it is often a bait or auction price that Pick is right to rank low.

Costs are compared before tax: item + shipping when Pick has a shipping figure for that store (a published policy or a USPS estimate), otherwise the item price alone, compared with your item price when you entered one.

The four headline metrics:

| Metric | Definition |
| --- | --- |
| Within 3% | Pick's cheapest exact listing is within 3% of your benchmark, either way |
| Missed entirely | Nothing in Pick's results comes close: no like-for-like listing between half of your price and 3% over it, and no listing from your benchmark store near your price |
| No twin | Pick showed no Similar pick chip for the query |
| Twin acceptable | Pick's first Similar pick matches your acceptable-twin list (out of queries with a twin and a filled list) |

Each benchmarked query also gets a `price_status` (`within-3pct`, `pick-cheaper`, `pick-higher`, `no-exact-listing`) and a separate `coverage` (`has-price`, `not-counted`, `missed`), so a query whose top listing is a bait price still shows whether Pick's data had the real one. `pick-cheaper` means Pick's top price is more than 3% under yours: check whether it is the same new item and a real offer before counting it as a win.

## Limits

- The exact-item rules and the condition, multipack and promotional checks are text rules. `listings.csv` shows every verdict and its reason so a wrong one is easy to spot and fix in `testset.json`.
- The shopper is US with the state in `testset.json` (NY). Any state gives the same before-tax comparison; the state only decides whether Pick's totals count as complete.
- Target's internal endpoint was blocked (HTTP 435, a bot challenge) on every query in the first capture, and was removed from Pick on 2026-10-03. Pick's only source is Google Shopping. The harness records whatever the sources return.
