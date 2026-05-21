import { createClient } from "@/lib/supabase/server";
import { sendPOEmail } from "@/lib/email";
import { getLimits } from "@/lib/plans";
import { parseBody, sendPOSchema } from "@/lib/validation";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { poIdempotencyKey } from "@/lib/idempotency";
import { withRetry, isNetworkTransient } from "@/lib/retry";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.sendPO);
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan gate
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const limits = getLimits(profile?.plan ?? "free");
  if (!limits.canSendPO) {
    return NextResponse.json(
      { error: "Upgrade to Starter or higher to send purchase orders.", upgrade: true },
      { status: 403 },
    );
  }

  const parsed = await parseBody(request, sendPOSchema);
  if (parsed.error) return parsed.error;
  const { supplierName, supplierEmail, productName, sku, quantity, estimatedCost, urgency, reasoning } = parsed.data;

  // Idempotency: prevent duplicate POs for same supplier+SKU within 1 hour
  const iKey = poIdempotencyKey(user.id, supplierEmail, sku);
  const { data: existingPO } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
    .eq("supplier_email", supplierEmail)
    .eq("sku", sku)
    .maybeSingle();

  if (existingPO?.status === "sent") {
    logger.warn("Duplicate PO prevented", { user_id: user.id, sku, supplier_email: supplierEmail, idempotency_key: iKey });
    return NextResponse.json({ ok: true, poId: existingPO.id, duplicate: true });
  }

  // Find supplier_id if exists
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("email", supplierEmail)
    .maybeSingle();

  // Save PO to database
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      user_id: user.id,
      supplier_id: supplier?.id ?? null,
      supplier_name: supplierName,
      supplier_email: supplierEmail,
      sku,
      product_name: productName,
      quantity,
      unit_cost: estimatedCost ? estimatedCost / quantity : null,
      total_cost: estimatedCost,
      urgency,
      reasoning,
      status: "approved",
    })
    .select("id")
    .single();

  if (poError || !po) {
    console.error("PO insert error:", poError);
    return NextResponse.json({ error: "Failed to save purchase order" }, { status: 500 });
  }

  // Send email via Resend
  try {
    await withRetry(
      () => sendPOEmail({
      to: supplierEmail,
      supplierName,
      merchantEmail: user.email ?? "merchant@stocksense.app",
      productName,
      sku,
      quantity,
      estimatedCost,
      reasoning,
      poId: po.id,
      plan: profile?.plan ?? "free",
    }),
    {
      attempts: 3,
      baseDelay: 1_000,
      shouldRetry: isNetworkTransient,
      label: "resend:send-po-email",
    }
  );

    // Mark as sent
    await supabase
      .from("purchase_orders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", po.id);

    logger.info("Purchase order sent", {
      user_id: user.id,
      po_id: po.id,
      supplier: supplierName,
      sku,
      quantity,
    });

    return NextResponse.json({ ok: true, poId: po.id });
  } catch (err) {
    console.error("Email send error:", err);
    // PO saved but email failed — return partial success
    return NextResponse.json(
      { ok: false, poId: po.id, error: "PO saved but email failed. Check supplier email." },
      { status: 207 },
    );
  }
}
