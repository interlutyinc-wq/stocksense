import Stripe from "stripe";

// Build-safe fallback — real key is set via Vercel env vars at runtime.
// Same pattern used in lib/supabase/client.ts and server.ts.
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
  { apiVersion: "2026-04-22.dahlia" },
);

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    amount: 49,
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    amount: 149,
  },
  agency: {
    name: "Agency",
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? "",
    amount: 399,
  },
} as const;

export type StripePlanKey = keyof typeof PLANS;
