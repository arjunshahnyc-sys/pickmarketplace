import { NextRequest, NextResponse } from "next/server";
import { lookupOffers, sameSeller, verifySizeCheckParams } from "@/lib/outbound";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { refreshSearchBudget, spendingPaused } from "@/lib/searchBudget";
import { sizeVerdict, type SizeCheckResult } from "@/lib/sizeSearch";

// "Check size" on a result card. Asks the paid product lookup (2 Serper
// credits, shared with /api/out's cache, so a click after a check is free)
// what the store's own listing says about the size the search was run for.
// Only signed links are answered (lib/outbound.ts), so it can only be asked
// about a product Pick showed, in the size it was shown for.
//
// Every failure is a 200 with status "unknown": the card just says it could
// not check, and the shopper still has the store link.

const UNKNOWN: SizeCheckResult = { status: "unknown", alsoAt: [] };

function json(body: SizeCheckResult, init?: { status?: number }) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export async function GET(req: NextRequest) {
  const params = verifySizeCheckParams(req.nextUrl.searchParams);
  if (!params) return json(UNKNOWN, { status: 400 });

  if (!checkRateLimit(req, RATE_LIMITS.sizeCheck).ok) return json(UNKNOWN, { status: 429 });

  await refreshSearchBudget();
  if (await spendingPaused()) return json(UNKNOWN);

  const offers = await lookupOffers(params.pid, params.market);
  if (!offers) return json(UNKNOWN);

  return json(
    sizeVerdict(
      offers,
      (source) => sameSeller(source, params.retailer, params.market),
      params.kind,
      params.size
    )
  );
}
