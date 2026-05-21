import type { Metadata } from "next";
import { AppProviders } from "@/components/analytics/app-providers";
import { Syne, DM_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "StockSense — The AI Agent for Supply Chain Management",
  description:
    "StockSense is the AI agent attacking supply chain management. It reasons through your inventory data, matches suppliers, and sends purchase orders automatically. Not a dashboard, not a tool — an agent that thinks and acts.",
  keywords: [
    "AI supply chain agent",
    "supply chain management AI",
    "automated purchase orders",
    "AI inventory agent",
    "supply chain automation",
    "AI reorder agent",
    "inventory AI agent",
    "supply chain software",
    "AI agent supply chain",
    "stockout prevention AI",
  ],
  authors: [{ name: "Interluty Inc.", url: "https://stocksense-interlutyinc-wqs-projects.vercel.app" }],
  creator: "Interluty Inc.",
  publisher: "Interluty Inc.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://stocksense-interlutyinc-wqs-projects.vercel.app",
    siteName: "StockSense",
    title: "StockSense — AI Supply Chain Agent for Shopify",
    description:
      "StockSense analyzes your live Shopify inventory, reasons through stock levels and supplier data, and sends purchase orders automatically. The first AI-native supply chain agent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StockSense — The AI Agent for Supply Chain Management",
    description: "Not a dashboard. An AI agent that reasons, decides, and acts.",
    images: ["https://stocksense-interlutyinc-wqs-projects.vercel.app/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
