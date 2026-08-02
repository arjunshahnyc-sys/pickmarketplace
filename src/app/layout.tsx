import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedListProvider } from "@/contexts/SavedListContext";
import SavedListDrawer from "@/components/SavedListDrawer";
import { OrganizationSchema, WebsiteSchema } from "@/components/StructuredData";

const SITE_URL = "https://pickmarketplace.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "0RU8rMwul--pZJv97ilC5UBOsETNmJByI5sV-pOoziA",
  },
  title: "Pick - Don't waste your money. Buy the same product for less.",
  description: "Compare prices across major retailers including Amazon, Target, Best Buy, and Walmart, plus Google Shopping. Find deals on electronics, clothing, home goods, and more.",
  openGraph: {
    title: "Pick - Don't waste your money. Buy the same product for less.",
    description: "One search compares prices across every major store, so you never overpay.",
    type: "website",
    siteName: "Pick",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pick - Don't waste your money. Buy the same product for less.",
    description: "One search compares prices across every major store, so you never overpay.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pick-bg">
        <OrganizationSchema
          name="Pick"
          url={SITE_URL}
          logo={`${SITE_URL}/logo.svg`}
          description="One search compares prices across every major store, so you never overpay."
        />
        <WebsiteSchema
          name="Pick"
          url={SITE_URL}
          description="One search compares prices across every major store, so you never overpay."
        />
        <AuthProvider>
          <SavedListProvider>
            {children}
            <SavedListDrawer />
          </SavedListProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
