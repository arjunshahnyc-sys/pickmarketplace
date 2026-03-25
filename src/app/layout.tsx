import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Pick Marketplace - Compare Prices, Find the Best Deals",
  description: "Compare prices across Amazon, Target, Best Buy, Walmart, and 50+ retailers. Find the best deals on electronics, clothing, home goods, and more. Save money instantly.",
  openGraph: {
    title: "Pick Marketplace - Compare Prices, Find the Best Deals",
    description: "Compare prices across 50+ major retailers and find the best deals on any product",
    type: "website",
    siteName: "Pick Marketplace",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pick Marketplace - Compare Prices Across 50+ Retailers",
    description: "Find the best deals on electronics, clothing, home goods, and more",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-pick-bg">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
