import { createClient } from "@/lib/supabase/server";
import { getLimits } from "@/lib/plans";
import { NextResponse } from "next/server";

function escapeCSV(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Plan gate
  const { data: profile } = await supabase
    .from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const limits = getLimits(profile?.plan ?? "free");

  if (!limits.canExportReports) {
    return NextResponse.json(
      { error: "Upgrade to Pro or Agency to export reports." },
      { status: 403 },
    );
  }

  // Fetch PO history
  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("created_at, status, product_name, sku, supplier_name, supplier_email, quantity, unit_cost, total_cost, urgency, reasoning, sent_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (orders ?? []).map((o) => ({
    date: new Date(o.created_at).toISOString().split("T")[0],
    status: o.status,
    product: o.product_name,
    sku: o.sku,
    supplier: o.supplier_name,
    supplier_email: o.supplier_email,
    quantity: o.quantity,
    unit_cost: o.unit_cost ?? "",
    total_cost: o.total_cost ?? "",
    urgency: o.urgency ?? "",
    reasoning: o.reasoning ?? "",
    sent_at: o.sent_at ? new Date(o.sent_at).toISOString().split("T")[0] : "",
  }));

  const csv = toCSV(rows);
  const filename = `stocksense-po-history-${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
