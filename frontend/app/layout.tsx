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
  title: "StockSense — AI Supply Chain Agent for Shopify",
  description:
    "StockSense is an AI agent that manages supply chains autonomously. It analyzes your Shopify inventory, reasons through stock levels, matches suppliers, and sends purchase orders automatically. Not a dashboard — an agent that acts.",
  keywords: [
    "AI inventory management",
    "Shopify inventory agent",
    "supply chain AI",
    "automated purchase orders",
    "AI reorder tool",
    "Shopify supplier management",
    "inventory optimization AI",
    "dropshipping automation",
    "AI supply chain agent",
    "stockout prevention",
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
    title: "StockSense — AI Supply Chain Agent",
    description: "Not a dashboard. An AI agent that manages your supply chain autonomously.",
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
