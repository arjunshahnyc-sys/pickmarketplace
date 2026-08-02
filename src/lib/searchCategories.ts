// Popular search categories with server-rendered landing pages at
// /search/[slug]. Shared by the page's generateStaticParams and the sitemap
// so the two can never drift. Keep slugs URL-safe (lowercase, hyphens) —
// dynamicParams=false means only these exact slugs resolve.
export interface SearchCategory {
  slug: string;
  query: string;
  label: string;
}

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { slug: 'headphones', query: 'headphones', label: 'Headphones' },
  { slug: 'laptops', query: 'laptops', label: 'Laptops' },
  { slug: 'shoes', query: 'shoes', label: 'Shoes' },
  { slug: 'skincare', query: 'skincare', label: 'Skincare' },
  { slug: 'watches', query: 'watches', label: 'Watches' },
  { slug: 'backpacks', query: 'backpacks', label: 'Backpacks' },
  { slug: 'coffee-makers', query: 'coffee makers', label: 'Coffee Makers' },
  { slug: 'gaming-mice', query: 'gaming mice', label: 'Gaming Mice' },
];

export function getSearchCategory(slug: string): SearchCategory | undefined {
  return SEARCH_CATEGORIES.find((c) => c.slug === slug);
}
