// Retailer search-page URL for a product — shared by the search endpoints so
// results never ship an empty or "#" link.

export function getSearchUrl(retailer: string, productName: string): string {
  const query = encodeURIComponent(productName);
  const urls: Record<string, string> = {
    'Amazon': `https://www.amazon.com/s?k=${query}`,
    'Walmart': `https://www.walmart.com/search?q=${query}`,
    'Target': `https://www.target.com/s?searchTerm=${query}`,
    'Best Buy': `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`,
    'Costco': `https://www.costco.com/CatalogSearch?keyword=${query}`,
    'eBay': `https://www.ebay.com/sch/i.html?_nkw=${query}`,
    'Nordstrom': `https://www.nordstrom.com/sr?keyword=${query}`,
  };
  // retailer can be third-party text (e.g. a merchant name from the Serper
  // feed) — encode it so it can't smuggle extra URL parameters.
  return urls[retailer] || `https://www.google.com/search?q=${query}+${encodeURIComponent(retailer)}`;
}
