import { createClient } from "@/lib/supabase/server";
import { sendPOEmail } from "@/lib/email";
import { getLimits } from "@/lib/plans";
import { NextResponse } from "next/server";

interface PORequest {
  supplierName: string;
  supplierEmail: string;
  productName: string;
  sku: string;
  quantity: number;
  estimatedCost: number | null;
  urgency: string;
  reasoning: string;
}

export async function POST(request: Request) {
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

  const body = (await request.json()) as PORequest;
  const { supplierName, supplierEmail, productName, sku, quantity, estimatedCost, urgency, reasoning } = body;

  if (!supplierEmail || !productName || !sku || !quantity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    await sendPOEmail({
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
    });

    // Mark as sent
    await supabase
      .from("purchase_orders")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", po.id);

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
