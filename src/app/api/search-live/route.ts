import { NextRequest, NextResponse } from "next/server";
import { buildRetailerDeepLinks } from "@/lib/scrapers";
import { performLiveSearch } from "@/lib/searchService";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

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

    const data = await performLiveSearch(q);
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
