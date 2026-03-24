import type { Metadata } from 'next';
import './globals.css';
import { ChatWidget } from '@/components/ChatWidget';

export const metadata: Metadata = {
  title: 'Pick — Never Overpay',
  description: 'Find better prices and discover similar products across 7 major retailers. Smart shopping assistant.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen texture-overlay">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
