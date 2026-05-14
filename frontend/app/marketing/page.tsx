import type { Metadata } from "next";
import { MarketingLanding } from "./marketing-landing";

export const metadata: Metadata = {
  title: "StockSense — Your AI Supply Chain Agent",
  description:
    "Not a tool. An agent that reasons through your inventory, explains every decision, and drafts purchase orders before stockouts cost you money.",
};

export default function MarketingPage() {
  return <MarketingLanding />;
}
