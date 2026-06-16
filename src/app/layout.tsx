import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Pick - Still broke. Still shopping.",
  description: "Compare prices across 12 major retailers including Amazon, Target, Best Buy, and Walmart, plus Google Shopping. Find deals on electronics, clothing, home goods, and more.",
  openGraph: {
    title: "Pick - Still broke. Still shopping.",
    description: "Search every store at once. Built for people who counted change at CVS last week.",
    type: "website",
    siteName: "Pick",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pick - Still broke. Still shopping.",
    description: "Search every store at once. Built for people who counted change at CVS last week.",
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
