// Ordering rules that keep a real price at the top of the results (plan
// item 2 in eval/PLAN.md, approved 2026-10-03). A 2026-09-22 capture of 50
// queries put eBay listings at $80.60 and $15.59 on top for AirPods while
// Best Buy sold them at $199.99 and $129.99, and put refurbished and resale
// units above new ones.
//
// Applied to the list the shopper sees, after the chosen sort and the
// grouping pass (productGrouping.ts), so every flag below is already set:
//   1. Possible scam listings go last in every sort.
//   2. A listing Pick flagged as priced far below what verified stores
//      charge for the same item (priceFlag) goes after every unflagged
//      listing in every sort; its card says why.
//   3. In the default and relevance orders, within one same-item group, a
//      unit that is not new (condition.ts) never ranks above a new one: the
//      group keeps its positions, refilled new units first. Item-price and
//      sale sorts keep strict price order; the card labels the condition.
//   4. In the default "Total cost" order, when the listing on top is not a
//      verified store's new unit, the first verified store's new listing of
//      the searched item takes the top slot, if it is in the same cost
//      bucket (a complete total never yields the top slot to a partial one).
// Order within each rule's groups is otherwise untouched.

import { isNotNew, listingCondition } from './condition';
import { totalResolution } from './landedCost/rank';
import type { EnhancedProduct } from './productGrouping';
import { classifySeller } from './retailerTrust';

/** Sorts that order by how good the deal is, where rules 3 and 4 apply. */
const DEAL_ORDERS = new Set(['total-cost', 'relevance']);

interface Facts {
  verified: boolean;
  notNew: boolean;
  bucket: string;
}

function factsOf(product: EnhancedProduct): Facts & { scam: boolean } {
  const level = classifySeller(product.retailer, { market: product.sourceMarket, url: product.url }).level;
  return {
    verified: level === 'verified',
    scam: level === 'flagged',
    notNew: isNotNew(listingCondition(product, level)),
    bucket: product.landedCost ? totalResolution(product.landedCost) : 'none',
  };
}

/**
 * Rule 3: inside each same-item group, new units take the group's first
 * positions. Only listings in the same cost bucket trade places, so a
 * listing Pick cannot total never jumps above a complete total.
 */
function newUnitsFirst<T extends EnhancedProduct>(list: T[], facts: Map<T, Facts>): T[] {
  const positions = new Map<string, number[]>();
  list.forEach((product, i) => {
    if (!product.groupId) return;
    const key = `${product.groupId}|${facts.get(product)?.bucket}`;
    positions.set(key, [...(positions.get(key) ?? []), i]);
  });
  const out = [...list];
  for (const indexes of positions.values()) {
    const members = indexes.map((i) => list[i]);
    const refill = [
      ...members.filter((p) => !facts.get(p)?.notNew),
      ...members.filter((p) => facts.get(p)?.notNew),
    ];
    indexes.forEach((position, k) => {
      out[position] = refill[k];
    });
  }
  return out;
}

/** Rule 4: a verified store's new listing of the searched item on top. */
function verifiedOnTop<T extends EnhancedProduct>(list: T[], facts: Map<T, Facts>): T[] {
  const top = list[0];
  if (!top) return list;
  const topFacts = facts.get(top) as Facts;
  const credible = (p: T) => {
    const f = facts.get(p) as Facts;
    return f.verified && !f.notNew;
  };
  if (credible(top)) return list;
  const j = list.findIndex(
    (p, i) => i > 0 && p.inSearchedItem && credible(p) && (facts.get(p) as Facts).bucket === topFacts.bucket
  );
  if (j < 0) return list;
  return [list[j], ...list.slice(0, j), ...list.slice(j + 1)];
}

export function orderForTrust<T extends EnhancedProduct>(products: T[], sort: string): T[] {
  const facts = new Map<T, Facts & { scam: boolean }>(products.map((p) => [p, factsOf(p)]));
  const scam = products.filter((p) => facts.get(p)?.scam);
  const bait = products.filter((p) => !facts.get(p)?.scam && p.priceFlag);
  let regular = products.filter((p) => !facts.get(p)?.scam && !p.priceFlag);

  if (DEAL_ORDERS.has(sort)) regular = newUnitsFirst(regular, facts);
  if (sort === 'total-cost') regular = verifiedOnTop(regular, facts);

  return [...regular, ...bait, ...scam];
}
