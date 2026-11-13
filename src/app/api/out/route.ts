import { NextRequest, NextResponse } from "next/server";
import { toAffiliateUrl } from "@/lib/affiliate";
import { resolveMerchantUrl, verifyClickParams } from "@/lib/outbound";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { refreshSearchBudget, spendingPaused } from "@/lib/searchBudget";

// Outbound click redirect. Result links point here so the merchant's real
// product page is looked up (2 Serper credits, plus 1 for a site search
// when that misses; both cached) only when a shopper actually clicks; see
// lib/outbound.ts for why.
//
// Every failure path still redirects the shopper to the link the card would
// have carried anyway. This route must never strand a click.

// Crawlers and link previewers follow hrefs without a shopper behind them.
// robots.txt disallows /api/, but not every bot asks; none of them should
// spend credits.
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|curl|wget|python|scrapy|httpclient/i;

function redirect(url: string): NextResponse {
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export async function GET(req: NextRequest) {
  const params = verifyClickParams(req.nextUrl.searchParams);
  if (!params) {
    // Unsigned or tampered: never redirect to a URL Pick did not issue.
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const source = { retailer: params.retailer, market: params.market };
  const fallback = toAffiliateUrl(params.fallback, source);

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return redirect(fallback);

  // Over budget: skip the paid lookup, keep the click.
  if (!checkRateLimit(req, RATE_LIMITS.out).ok) return redirect(fallback);

  // Paid lookups paused by the spending guard: same answer, the click goes
  // to the fallback link.
  await refreshSearchBudget();
  if (await spendingPaused()) return redirect(fallback);

  const resolved = await resolveMerchantUrl(params.pid, params.retailer, params.market, params.title);
  return redirect(resolved ? toAffiliateUrl(resolved, source) : fallback);
}
