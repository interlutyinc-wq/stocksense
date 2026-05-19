import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    amount: 49,
    features: ["Up to 50 SKUs", "Amazon + Shopify", "AI reasoning + explanations", "30-day forecast", "1 user"],
  },
  agent: {
    name: "Agent",
    priceId: process.env.STRIPE_AGENT_PRICE_ID!,
    amount: 149,
    features: ["Unlimited SKUs", "All channels + multi-warehouse", "Autonomous PO generation", "90-day AI forecast", "5 users"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
