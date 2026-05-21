import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stocksense-interlutyinc-wqs-projects.vercel.app";

interface ShopifyVariant {
  sku: string | null;
  title: string;
  inventory_quantity: number | null;
  inventory_management: string | null;
}

interface ShopifyProduct {
  title: string;
  variants: ShopifyVariant[];
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Get all users with Starter+ plan and connected Shopify
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, plan")
    .in("plan", ["starter", "pro", "agency"]);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No eligible users", processed: 0 });
  }

  let alertsSent = 0;
  let errors = 0;

  for (const profile of profiles) {
    try {
      // Get Shopify connection
      const { data: conn } = await supabase
        .from("shopify_connections")
        .select("shop_domain, access_token")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conn) continue;

      // Fetch inventory (lightweight — no AI, just Shopify API)
      const res = await fetch(
        `https://${conn.shop_domain}/admin/api/2024-01/products.json?limit=250&status=active&fields=title,variants`,
        {
          headers: { "X-Shopify-Access-Token": conn.access_token },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) continue;

      const data = await res.json() as { products: ShopifyProduct[] };
      const products = data.products ?? [];

      // Find critical SKUs (stock ≤ 5)
      const criticalItems: { product: string; sku: string; stock: number }[] = [];

      for (const p of products) {
        for (const v of p.variants) {
          if (
            (v.inventory_management === "shopify" || v.inventory_quantity !== null) &&
            (v.inventory_quantity ?? 0) <= 5
          ) {
            criticalItems.push({
              product: p.title,
              sku: v.sku ?? v.title,
              stock: v.inventory_quantity ?? 0,
            });
          }
        }
      }

      if (criticalItems.length === 0) continue;

      // Save inventory snapshot
      const snapshots = products.flatMap(p =>
        p.variants
          .filter(v => v.inventory_management === "shopify" || v.inventory_quantity !== null)
          .map(v => ({
            user_id: profile.id,
            shop_domain: conn.shop_domain,
            sku: v.sku ?? v.title,
            stock_level: v.inventory_quantity ?? 0,
          }))
      );
      await supabase.from("inventory_snapshots").insert(snapshots.slice(0, 100));

      // Send alert email
      const itemsList = criticalItems
        .slice(0, 10)
        .map(item => `<tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 16px;font-weight:600">${item.product}</td>
          <td style="padding:10px 16px;font-family:monospace;color:#6b7280">${item.sku}</td>
          <td style="padding:10px 16px;font-weight:700;color:${item.stock === 0 ? "#ef4444" : "#f97316"}">${item.stock} units</td>
        </tr>`)
        .join("");

      await resend.emails.send({
        from: "StockSense <onboarding@resend.dev>",
        to: profile.email,
        subject: `⚠️ ${criticalItems.length} critical SKU${criticalItems.length > 1 ? "s" : ""} — ${conn.shop_domain}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
        <tr><td style="background:#080808;padding:20px 32px">
          <span style="font-size:18px;font-weight:800;color:#ffffff">Stock<span style="color:#ff4d1c">Sense</span></span>
          <span style="float:right;font-size:11px;color:#4a4a4a;margin-top:4px">Daily Alert</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111827">⚠️ Critical stock alert</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
            Your StockSense agent found <strong>${criticalItems.length} SKU${criticalItems.length > 1 ? "s" : ""}</strong> with critically low stock in <strong>${conn.shop_domain}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
            <tr style="background:#f9fafb">
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Product</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">SKU</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Stock</th>
            </tr>
            ${itemsList}
          </table>
          ${criticalItems.length > 10 ? `<p style="margin:12px 0 0;color:#6b7280;font-size:12px">...and ${criticalItems.length - 10} more items.</p>` : ""}
          <div style="margin-top:24px;text-align:center">
            <a href="${APP_URL}/dashboard" style="display:inline-block;background:#ff4d1c;color:#ffffff;font-weight:700;padding:12px 28px;text-decoration:none;border-radius:4px;font-size:14px">
              Analyze inventory & send POs →
            </a>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:11px;color:#9ca3af">StockSense · AI agent for supply chain management</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });

      alertsSent++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    message: "Cron completed",
    users_processed: profiles.length,
    alerts_sent: alertsSent,
    errors,
    timestamp: new Date().toISOString(),
  });
}
