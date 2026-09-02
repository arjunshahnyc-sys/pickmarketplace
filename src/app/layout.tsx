import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
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
// One source for the page title and description: the <title>, OpenGraph,
// Twitter card, and both JSON-LD blocks all read these, so they cannot drift.
const SITE_TITLE = "Pick - Find a cheaper product with the same key specs.";
const SITE_DESCRIPTION =
  "Type in what you want. Pick looks for a different product with the same key specs, reviews about as good, and a lower price, and shows why they compare. Free.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "0RU8rMwul--pZJv97ilC5UBOsETNmJByI5sV-pOoziA",
  },
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: "Pick",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
          description={SITE_DESCRIPTION}
        />
        <WebsiteSchema
          name="Pick"
          url={SITE_URL}
          description={SITE_DESCRIPTION}
        />
        <AuthProvider>
          <SavedListProvider>
            <DestinationProvider>
              {children}
            </DestinationProvider>
            <SavedListDrawer />
          </SavedListProvider>
        </AuthProvider>
        {/* Same-origin script + beacon (/_vercel/insights/*), so the strict
            CSP's 'self' policy covers it without changes. */}
        <Analytics />
      </body>
    </html>
  );
}
