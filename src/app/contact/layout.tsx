import type { Metadata } from 'next';

// The contact page is a client component, so its metadata lives here;
// without it the page inherited the homepage title and description.
export const metadata: Metadata = {
  title: 'Contact Us - Pick Marketplace',
  description: 'Questions, feedback, or a problem with a listing? Get in touch with the Pick Marketplace team.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
