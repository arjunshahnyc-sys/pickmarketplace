import { NextResponse } from "next/server";
import { isAffiliateUrl } from "@/lib/affiliate";
import type { HomeDeal, HomeDeals } from "@/lib/blackFridayDeal";
import { realDeals } from "@/lib/priceCheck";
import { loadPriceCheck } from "@/lib/priceCheckData";
import { isBlackFridayWindow } from "@/lib/season";

// The real deals the landing page's Black Friday band leads with: the
// products on /price-check/black-friday whose lowest confirmed price today
// is below their usual range. It reads the same day-long data the page
// does (lib/priceCheckData.ts), so it runs no searches of its own unless it
// is the first to ask that day. The CDN keeps the answer for an hour, so
// the function itself runs about once an hour whatever the traffic.
//
// Anything that goes wrong is an empty list, not cached: the band then
// shows its plain headline.

/** How many tiles the band shows. */
const SHOWN = 4;
// The first ask of the day waits on 27 searches.
export const maxDuration = 120;

const EMPTY: HomeDeals = { hero: null, deals: [], total: 0 };

/**
 * The deal the first fold shows. It is the page's opening example, so it is
 * the deepest deal that tells the whole story (a store sticker to compare
 * with) and whose seller is certain: an offer listed as "Walmart" can be a
 * third-party seller on walmart.com, so Walmart offers are passed over when
 * anything else qualifies.
 */
function pickHero(deals: HomeDeal[]): HomeDeal | null {
  const certain = deals.filter((d) => !/walmart/i.test(d.store));
  return certain.find((d) => d.crossedOut !== null) ?? certain[0] ?? deals[0] ?? null;
}

export async function GET() {
  if (!isBlackFridayWindow(new Date())) {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const { rows } = await loadPriceCheck("black-friday");
    const all: HomeDeal[] = realDeals(rows)
      .filter((r) => r.image)
      .map((r) => ({
        slug: r.entry.slug,
        name: r.entry.name,
        price: r.today!.price,
        usualLow: r.googleTypicalRange![0],
        usualHigh: r.googleTypicalRange![1],
        crossedOut: r.crossedOut,
        store: r.today!.store,
        image: r.image!,
        href: r.today!.clickUrl ?? r.today!.url,
        sponsored: isAffiliateUrl(r.today!.url),
      }));
    const hero = pickHero(all);
    const body: HomeDeals = {
      hero,
      total: all.length,
      deals: all.filter((d) => d !== hero).slice(0, SHOWN),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[black-friday-deals]", error instanceof Error ? error.message : String(error));
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  }
}
