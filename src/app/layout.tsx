import type { Metadata } from 'next';
import './globals.css';
import { ChatWidget } from '@/components/ChatWidget';
import { AuthProvider } from '@/contexts/AuthContext';
import { Footer } from '@/components/Footer';
import { SkipToContent } from '@/components/SkipToContent';
import { OrganizationSchema, WebsiteSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Pick — Never Overpay Again',
  description: 'AI-powered shopping assistant that finds better prices and similar products across 50+ retailers in real-time. Save money on every purchase.',
  keywords: ['price comparison', 'shopping assistant', 'save money', 'best deals', 'product search', 'online shopping'],
  authors: [{ name: 'Pick Marketplace' }],
  creator: 'Pick Marketplace',
  publisher: 'Pick Marketplace',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://pickmarketplace.com'),
  openGraph: {
    title: 'Pick — Never Overpay Again',
    description: 'AI-powered shopping assistant that finds better prices and similar products across 50+ retailers in real-time.',
    url: 'https://pickmarketplace.com',
    siteName: 'Pick Marketplace',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pick Marketplace: Never Overpay',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pick — Never Overpay Again',
    description: 'AI-powered shopping assistant that finds better prices across 50+ retailers.',
    images: ['/og-image.png'],
    creator: '@pickmarketplace',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-icon',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <OrganizationSchema
          name="Pick Marketplace"
          url="https://pickmarketplace.com"
          logo="https://pickmarketplace.com/icon"
          description="AI-powered shopping assistant that finds better prices and similar products across 50+ retailers in real-time."
        />
        <WebsiteSchema
          name="Pick Marketplace"
          url="https://pickmarketplace.com"
          description="Never overpay again. AI-powered shopping assistant that finds better prices across 50+ retailers."
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-black">
        <SkipToContent />
        <AuthProvider>
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
