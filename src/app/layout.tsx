import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedListProvider } from "@/contexts/SavedListContext";
import SavedListDrawer from "@/components/SavedListDrawer";

export const metadata: Metadata = {
  title: "Pick - Don't waste your money. Buy the same product for less.",
  description: "Compare prices across major retailers including Amazon, Target, Best Buy, and Walmart, plus Google Shopping. Find deals on electronics, clothing, home goods, and more.",
  openGraph: {
    title: "Pick - Don't waste your money. Buy the same product for less.",
    description: "One search compares prices across every major store, so you never overpay.",
    type: "website",
    siteName: "Pick",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pick - Don't waste your money. Buy the same product for less.",
    description: "One search compares prices across every major store, so you never overpay.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pick-bg">
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
