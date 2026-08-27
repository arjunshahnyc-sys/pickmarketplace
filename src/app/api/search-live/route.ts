import { NextRequest, NextResponse } from "next/server";
import { buildRetailerDeepLinks, type FeedMarket } from "@/lib/scrapers";
import { performLiveSearch } from "@/lib/searchService";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { landedCostEnabled } from "@/lib/flags";

// Destination countries whose local shopping feed joins the US one when the
// landed-cost flag is on. All six destinations active (price formats probed
// and merchant tables built 2026-08-27).
const MARKET_BY_DEST: Record<string, FeedMarket> = {
  GB: "gb",
  DE: "de",
  FR: "fr",
  CA: "ca",
  AU: "au",
  JP: "jp",
};

export async function GET(req: NextRequest) {
  try {
    // Input validation
    const q = req.nextUrl.searchParams.get("q") || "";

    // Validate: empty query
    if (!q.trim()) {
      return NextResponse.json(
        { error: "Search query is required", results: [], retailerSearchLinks: [], message: "" },
        { status: 400 }
      );
    }

    // Validate: max length (200 characters)
    if (q.length > 200) {
      return NextResponse.json(
        { error: "Search query is too long (max 200 characters)", results: [], retailerSearchLinks: [], message: "" },
        { status: 400 }
      );
    }

    // Rate limit after validation so malformed requests don't consume budget,
    // but before the (paid) live search runs. Body keeps the same fallback
    // fields as the other error paths — the homepage renders them.
    const rl = checkRateLimit(req, RATE_LIMITS.search);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: "Too many searches. Please wait a moment and try again.",
          results: [],
          retailerSearchLinks: buildRetailerDeepLinks(q),
          message: "Search retailers directly:",
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    // Flag-gated: without the flag (or without a mapped destination) this is
    // the legacy US-only search, byte-identical.
    const dest = landedCostEnabled() ? req.nextUrl.searchParams.get("dest") : null;
    const extraMarket = dest ? MARKET_BY_DEST[dest.toUpperCase()] : undefined;
    const data = await performLiveSearch(q, extraMarket ? [extraMarket] : []);

    // Every price source failed: report an outage instead of a 200 that
    // renders as "no results found" for a query that may match plenty.
    if (data.allSourcesFailed && data.results.length === 0) {
      return NextResponse.json(
        {
          ...data,
          error: "Our price sources are unavailable right now. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    // Log error for debugging
    console.error("Search API error:", error);

    // Return user-friendly error response with retailer links as fallback
    const q = req.nextUrl.searchParams.get("q") || "";
    return NextResponse.json(
      {
        error: "An error occurred while searching. Please try again.",
        results: [],
        retailerSearchLinks: q ? buildRetailerDeepLinks(q) : [],
        message: "Search retailers directly:",
      },
      { status: 500 }
    );
  }
}
