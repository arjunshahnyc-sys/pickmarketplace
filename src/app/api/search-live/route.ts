import { NextRequest, NextResponse } from "next/server";
import { searchTarget, searchGoogleShoppingAPI, buildRetailerDeepLinks } from "@/lib/scrapers";

const cache = new Map<string, { data: any; ts: number }>();
const TTL = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const CACHE_EVICTION_COUNT = 20;

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

    const key = q.toLowerCase().trim();

    // Check cache
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < TTL) {
      return NextResponse.json(cached.data);
    }

    // Search both APIs in parallel
    const [googleResults, targetResults] = await Promise.all([
      searchGoogleShoppingAPI(q),
      searchTarget(q),
    ]);

    // Combine and deduplicate results (prefer Target results for same products)
    const allResults = [...googleResults, ...targetResults];

    // Deduplicate by product name (case-insensitive)
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((product) => {
      const normalizedName = product.name.toLowerCase().trim();
      if (seen.has(normalizedName)) {
        return false;
      }
      seen.add(normalizedName);
      return true;
    });

    // Always generate retailer search links
    const retailerLinks = buildRetailerDeepLinks(q);

    // Get unique retailers from results
    const retailersFound = Array.from(new Set(uniqueResults.map(p => p.retailer)));

    // Determine message based on results
    let message = "";
    if (uniqueResults.length > 0) {
      if (retailersFound.length > 1) {
        message = `Showing results from ${retailersFound.slice(0, -1).join(', ')} and ${retailersFound[retailersFound.length - 1]}. Search more retailers below.`;
      } else {
        message = `Showing results from ${retailersFound[0]}. Search other retailers directly below.`;
      }
    } else {
      message = "No exact product matches found. Search retailers directly:";
    }

    const data = {
      results: uniqueResults,
      retailerSearchLinks: retailerLinks,
      message,
      retailersFound, // For frontend to display dynamic header
    };

    // Cache eviction: if cache is too large, delete oldest entries
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries());
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].ts - b[1].ts);
      // Delete oldest entries
      for (let i = 0; i < CACHE_EVICTION_COUNT && i < entries.length; i++) {
        cache.delete(entries[i][0]);
      }
    }

    // Add to cache
    cache.set(key, { data, ts: Date.now() });

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
