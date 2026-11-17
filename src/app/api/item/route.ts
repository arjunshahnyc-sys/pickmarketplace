import { NextRequest, NextResponse } from "next/server";
import { isAffiliateUrl, toAffiliateUrl } from "@/lib/affiliate";
import {
  buildClickUrl,
  lookupProduct,
  sameSeller,
  stripTrackingParams,
  verifyItemParams,
  type MerchantOffer,
} from "@/lib/outbound";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { getRetailerTrust } from "@/lib/retailerTrust";
import { refreshSearchBudget, spendingPaused } from "@/lib/searchBudget";
import { sizeVerdict } from "@/lib/sizeSearch";
import type { ItemDetails, ItemOffer } from "@/lib/itemView";
import type { Product } from "@/lib/types";

// Details for Pick's own product page (/item): photos, description, the
// clicked store's price and stock, the other stores selling it, and the
// size verdict when the search had a size. One paid product lookup (2
// Serper credits) through the cache /api/out and /api/size-check share, so
// the click on to the store afterwards costs nothing more.
//
// Fetched by the page's client view, never rendered server-side: a crawler
// that loads /item without running scripts spends nothing. Every failure
// is `{ ok: false }` and the page keeps what the signed link carries (title,
// price, image, the button to the store).

const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|curl|wget|python|scrapy|httpclient/i;

function json(body: ItemDetails, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const params = verifyItemParams(req.nextUrl.searchParams);
  if (!params) return json({ ok: false }, 400);

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return json({ ok: false });
  if (!checkRateLimit(req, RATE_LIMITS.item).ok) return json({ ok: false }, 429);

  await refreshSearchBudget();
  if (await spendingPaused()) return json({ ok: false });

  const found = await lookupProduct(params.pid, params.market, { retry: true });
  if (!found) {
    // Nothing from the lookup: the size box can still say what the
    // listing's own title says.
    return json({
      ok: false,
      ...(params.kind && params.size
        ? { size: sizeVerdict([], () => false, params.kind, params.size, params.title) }
        : {}),
    });
  }

  const { market } = params;
  const asOffer = (o: MerchantOffer): ItemOffer => {
    const url = toAffiliateUrl(stripTrackingParams(o.link), { retailer: o.source, market });
    return {
      store: o.source,
      title: o.title ?? found.info?.title ?? params.title,
      price: o.price,
      originalPrice: o.originalPrice,
      details: o.details ?? [],
      url,
      sponsored: isAffiliateUrl(url),
      trust: getRetailerTrust(o.source, { market, url: o.link }).level,
    };
  };

  const own = found.offers.filter((o) => sameSeller(o.source, params.retailer, market));
  const sellerOffer = own[0];

  // The button to the store. A commission-eligible store keeps its
  // /api/out link (free now that the lookup is cached, and it still gets
  // the second-chance site search); the others go straight to the store's
  // own page from the lookup, or to the link the card carried.
  const clickUrl = buildClickUrl({
    googleProductId: params.pid,
    retailer: params.retailer,
    sourceMarket: market,
    url: params.fallback,
    name: params.title,
  } as Product);
  const source = { retailer: params.retailer, market };
  const storeUrl =
    clickUrl ?? toAffiliateUrl(sellerOffer ? stripTrackingParams(sellerOffer.link) : params.fallback, source);

  return json({
    ok: true,
    title: sellerOffer?.title ?? found.info?.title ?? params.title,
    description: found.info?.description ?? "",
    images: found.info?.images ?? [],
    seller: sellerOffer ? { ...asOffer(sellerOffer), host: hostOf(sellerOffer.link) } : null,
    storeUrl,
    others: found.offers.filter((o) => !own.includes(o)).slice(0, 8).map(asOffer),
    ...(params.kind && params.size
      ? { size: sizeVerdict(found.offers, (s) => sameSeller(s, params.retailer, market), params.kind, params.size, params.title) }
      : {}),
  });
}
