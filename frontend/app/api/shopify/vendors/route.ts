import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ShopifyVariant {
  sku: string | null;
}

interface ShopifyProduct {
  vendor: string;
  variants: ShopifyVariant[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface VendorSuggestion {
  name: string;
  skus: string[];
}

export async function GET() {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Shopify connection
  const { data: conn } = await supabase
    .from("shopify_connections")
    .select("shop_domain, access_token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({ error: "No Shopify store connected." }, { status: 400 });
  }

  // Fetch all active products from Shopify
  let products: ShopifyProduct[] = [];
  try {
    const res = await fetch(
      `https://${conn.shop_domain}/admin/api/2024-01/products.json?limit=250&status=active&fields=vendor,variants`,
      {
        headers: {
          "X-Shopify-Access-Token": conn.access_token,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch Shopify products." }, { status: 502 });
    }
    const data = (await res.json()) as ShopifyProductsResponse;
    products = data.products ?? [];
  } catch {
    return NextResponse.json({ error: "Network error fetching Shopify products." }, { status: 502 });
  }

  // Group by vendor → collect unique SKUs
  const vendorMap = new Map<string, Set<string>>();
  for (const p of products) {
    const vendor = p.vendor?.trim();
    if (!vendor) continue;
    if (!vendorMap.has(vendor)) vendorMap.set(vendor, new Set());
    for (const v of p.variants) {
      if (v.sku?.trim()) vendorMap.get(vendor)!.add(v.sku.trim());
    }
  }

  // Fetch already-saved supplier names to avoid duplicates
  const { data: existing } = await supabase
    .from("suppliers")
    .select("name");
  const existingNames = new Set((existing ?? []).map((s: { name: string }) => s.name.toLowerCase()));

  // Build suggestions — skip vendors already saved
  const vendors: VendorSuggestion[] = [];
  for (const [name, skuSet] of vendorMap.entries()) {
    if (existingNames.has(name.toLowerCase())) continue;
    vendors.push({ name, skus: Array.from(skuSet) });
  }

  return NextResponse.json({ vendors });
}
