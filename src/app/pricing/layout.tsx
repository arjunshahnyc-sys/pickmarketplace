import type { Metadata } from 'next';

// The pricing page is a client component, so its metadata lives here;
// without it the page inherited the homepage title and description.
export const metadata: Metadata = {
  title: 'Pricing - Pick Marketplace',
  description: 'Pick is free to use, with a Premium plan for unlimited searches and more results per search. Free to activate while we are in beta.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
