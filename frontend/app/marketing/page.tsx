import type { Metadata } from "next";
import { MarketingLanding } from "./marketing-landing";
import Script from "next/script";

export const metadata: Metadata = {
  title: "StockSense — AI Supply Chain Agent for Shopify | Automated Purchase Orders",
  description:
    "StockSense is the first AI-native supply chain agent for Shopify merchants. It analyzes live inventory, reasons through stock levels, matches suppliers, and sends purchase orders automatically. Starting at $49/month.",
  alternates: {
    canonical: "https://stocksense-interlutyinc-wqs-projects.vercel.app/marketing",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "StockSense",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://stocksense-interlutyinc-wqs-projects.vercel.app",
      "description": "AI-native supply chain agent for Shopify merchants. Analyzes inventory, reasons through stock levels, matches suppliers, and sends purchase orders automatically.",
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter",
          "price": "49",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "RecurringCharge", "billingPeriod": "P1M" },
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "149",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "RecurringCharge", "billingPeriod": "P1M" },
        },
        {
          "@type": "Offer",
          "name": "Agency",
          "price": "399",
          "priceCurrency": "USD",
          "priceSpecification": { "@type": "RecurringCharge", "billingPeriod": "P1M" },
        },
      ],
      "featureList": [
        "Live Shopify inventory analysis",
        "AI-powered reorder recommendations with full reasoning",
        "Automated purchase order generation",
        "Supplier matching and management",
        "Support for inventory, dropshipping, and hybrid business models",
        "Email PO delivery to suppliers",
      ],
      "creator": {
        "@type": "Organization",
        "name": "Interluty Inc.",
        "address": { "@type": "PostalAddress", "addressCountry": "US", "addressRegion": "DE" },
      },
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is StockSense?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "StockSense is an AI-native supply chain agent for Shopify merchants. Unlike traditional inventory tools that show dashboards, StockSense reasons through your live inventory data, identifies stockout risks, matches products to suppliers, and sends purchase orders automatically with full plain-language explanations.",
          },
        },
        {
          "@type": "Question",
          "name": "How does StockSense work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "StockSense connects to your Shopify store via OAuth, fetches live inventory data, and uses Claude AI to analyze stock levels against your supplier relationships. It generates structured reorder recommendations with reasoning, and sends purchase orders directly to your suppliers via email with one click.",
          },
        },
        {
          "@type": "Question",
          "name": "What is the difference between StockSense and other inventory tools?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Traditional tools like Linnworks, Brightpearl, and Inventory Planner show dashboards and send alerts. StockSense is an AI agent — it tells you exactly what to order, how much, why, and sends the purchase order to your supplier automatically. It explains every decision in plain language, which no competitor does.",
          },
        },
        {
          "@type": "Question",
          "name": "Does StockSense work for dropshipping?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. StockSense supports three business models: traditional inventory (own stock), dropshipping (supplier fulfills directly), and hybrid. For dropshipping, the AI focuses on fulfillment risk and sales velocity instead of reorder quantities.",
          },
        },
        {
          "@type": "Question",
          "name": "How much does StockSense cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "StockSense offers four plans: Free (10 SKUs, 1 analysis/month), Starter at $49/month (50 SKUs, unlimited analyses, PO sending), Pro at $149/month (unlimited SKUs, export reports, 3 users), and Agency at $399/month (up to 5 stores, 10 users).",
          },
        },
        {
          "@type": "Question",
          "name": "Which AI model does StockSense use?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "StockSense uses Claude Sonnet by Anthropic for inventory reasoning and recommendation generation. The AI analyzes sales velocity, supplier lead times, and seasonal patterns to generate actionable reorder recommendations with full explanations.",
          },
        },
      ],
    },
  ],
};

export default function MarketingPage() {
  return (
    <>
      <Script
        id="stocksense-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingLanding />
    </>
  );
}
