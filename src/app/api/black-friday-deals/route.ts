import { NextResponse } from "next/server";
import { isAffiliateUrl } from "@/lib/affiliate";
import type { HomeDeals } from "@/lib/blackFridayDeal";
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

const EMPTY: HomeDeals = { deals: [], total: 0 };

export async function GET() {
  if (!isBlackFridayWindow(new Date())) {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const { rows } = await loadPriceCheck("black-friday");
    const all = realDeals(rows).filter((r) => r.image);
    const body: HomeDeals = {
      total: all.length,
      deals: all.slice(0, SHOWN).map((r) => ({
        slug: r.entry.slug,
        name: r.entry.name,
        price: r.today!.price,
        usualLow: r.googleTypicalRange![0],
        store: r.today!.store,
        image: r.image!,
        href: r.today!.clickUrl ?? r.today!.url,
        sponsored: isAffiliateUrl(r.today!.url),
      })),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("[black-friday-deals]", error instanceof Error ? error.message : String(error));
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "no-store" } });
  }
}
