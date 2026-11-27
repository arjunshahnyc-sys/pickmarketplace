import { NextRequest, NextResponse } from "next/server";
import { confirmsListing, dealVerdict, NO_DEAL, parseDollarPrice, type DealCheckResult } from "@/lib/blackFridayDeal";
import { lookupProduct, sameSeller, verifyDealCheckParams } from "@/lib/outbound";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { refreshSearchBudget, spendingPaused } from "@/lib/searchBudget";
import { isBlackFridayWindow } from "@/lib/season";

// Whether a result card is a Black Friday deal (lib/blackFridayDeal.ts has
// the rule). One paid product lookup (2 Serper credits), through the cache
// it shares with /api/out, /api/size-check and /api/item, so a click after
// a check is free. Only signed links are answered, so it can only be asked
// about a product Pick showed, at the price it showed.
//
// Every failure is a plain "not a deal": the card just carries no mark.
// `checked` is true only when the lookup answered. Google has no product
// page for many search rows (a 404, which is not billed), and the results
// page moves on to the next card when it hears that.

function json(body: DealCheckResult, init?: { status?: number }) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export async function GET(req: NextRequest) {
  const params = verifyDealCheckParams(req.nextUrl.searchParams);
  if (!params) return json(NO_DEAL, { status: 400 });
  // Links issued in the window stop being answered once it closes.
  if (!isBlackFridayWindow(new Date())) return json(NO_DEAL);

  if (!checkRateLimit(req, RATE_LIMITS.dealCheck).ok) return json(NO_DEAL, { status: 429 });

  await refreshSearchBudget();
  if (await spendingPaused()) return json(NO_DEAL);

  const lookup = await lookupProduct(params.pid, params.market);
  if (!lookup) return json(NO_DEAL);

  // The card's own store, at the card's price, in a list about the card's
  // product: anything less and the lookup is not about this card (it often
  // is not, see confirmsListing), so there is no mark.
  const cardPrice = Number(params.price);
  const own = lookup.offers.find(
    (o) =>
      sameSeller(o.source, params.retailer, params.market) &&
      confirmsListing(cardPrice, params.title, parseDollarPrice(o.price), o.title ?? lookup.info?.title ?? "")
  );
  if (!own) return json({ deal: false, checked: true });

  const verdict = dealVerdict(parseDollarPrice(own.price)!, parseDollarPrice(own.originalPrice), lookup.typicalRange ?? null);
  return json({ ...verdict, checked: true });
}
