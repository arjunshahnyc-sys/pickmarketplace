import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedListProvider } from "@/contexts/SavedListContext";
import { DestinationProvider } from "@/contexts/DestinationContext";
import SavedListDrawer from "@/components/SavedListDrawer";
import { SkipToContent } from "@/components/SkipToContent";
import { OrganizationSchema, WebsiteSchema } from "@/components/StructuredData";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
});

const SITE_URL = "https://pickmarketplace.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "0RU8rMwul--pZJv97ilC5UBOsETNmJByI5sV-pOoziA",
  },
  title: "Pick - Don't waste your money. Buy the same product for less.",
  description: "Compare prices from Target and Google Shopping listings across major retailers like Amazon, Walmart, and Best Buy. Find deals on electronics, clothing, home goods, and more.",
  openGraph: {
    title: "Pick - Don't waste your money. Buy the same product for less.",
    description: "One search compares prices from Target and Google Shopping listings across major retailers. Same item, or a similar one for less.",
    type: "website",
    siteName: "Pick",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pick - Don't waste your money. Buy the same product for less.",
    description: "One search compares prices from Target and Google Shopping listings across major retailers. Same item, or a similar one for less.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlex.variable}`}>
      <body className="min-h-screen bg-pick-bg">
        <SkipToContent />
        <OrganizationSchema
          name="Pick"
          url={SITE_URL}
          logo={`${SITE_URL}/logo.svg`}
          description="One search compares prices from Target and Google Shopping listings across major retailers. Same item, or a similar one for less."
        />
        <WebsiteSchema
          name="Pick"
          url={SITE_URL}
          description="One search compares prices from Target and Google Shopping listings across major retailers. Same item, or a similar one for less."
        />
        <AuthProvider>
          <SavedListProvider>
            <DestinationProvider>
              {children}
            </DestinationProvider>
            <SavedListDrawer />
          </SavedListProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
