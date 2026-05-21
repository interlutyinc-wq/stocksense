import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Map Stripe price IDs → plan names
function planFromPriceId(priceId: string): "starter" | "pro" | "agency" | null {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_AGENT_PRICE_ID) return "pro"; // legacy
  if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) return "agency";
  return null;
}

async function updateUserPlan(
  supabaseUserId: string,
  plan: "free" | "starter" | "pro" | "agency",
  subscriptionId: string | null,
) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ plan, stripe_subscription_id: subscriptionId })
    .eq("id", supabaseUserId);
  logger.info("User plan updated", { user_id: supabaseUserId, plan, subscription_id: subscriptionId });
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const rawPlan = session.metadata?.plan;
      const plan = (rawPlan === "agent" ? "pro" : rawPlan) as "starter" | "pro" | "agency" | undefined;
      const subId = typeof session.subscription === "string" ? session.subscription : null;

      if (userId && plan) {
        await updateUserPlan(userId, plan, subId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? planFromPriceId(priceId) : null;

      if (userId && plan && (sub.status === "active" || sub.status === "trialing")) {
        await updateUserPlan(userId, plan, sub.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await updateUserPlan(userId, "free", null);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
