import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLimits } from "@/lib/plans";
import { NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShopifyVariant {
  id: number;
  sku: string | null;
  title: string;
  price: string;
  inventory_quantity: number | null;
  inventory_management: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  variants: ShopifyVariant[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface SupplierRow {
  name: string;
  email: string;
  skus: string[];
}

export interface Recommendation {
  sku: string;
  product: string;
  current_stock: number;
  daily_velocity: number;
  days_remaining: number;
  status: "critical" | "low" | "ok";
  urgency: "critical" | "high" | "medium" | "low";
  supplier: string | null;
  supplier_email: string | null;
  reorder_qty: number;
  estimated_cost: number | null;
  reasoning: string;
}

export interface AnalysisResult {
  summary: string;
  recommendations: Recommendation[];
  total_skus_analyzed: number;
  items_needing_attention: number;
  shop_domain: string;
  analyzed_at: string;
  sku_limit_applied?: boolean;
  total_skus_in_store?: number;
}

// ── Route handler ──────────────────────────────────────────────────────────────

type BusinessModel = "inventory" | "dropshipping" | "hybrid";

function buildPrompts(
  model: BusinessModel,
  shopDomain: string,
  inventoryItems: object[],
  supplierList: object[],
): { system: string; user: string } {
  const base = `You are StockSense, an AI-native supply chain agent for e-commerce merchants.
Always explain your reasoning in plain language. Be specific and actionable.
Return ONLY valid JSON — no markdown, no code fences, no preamble.`;

  if (model === "dropshipping") {
    return {
      system: `${base}
This merchant uses DROPSHIPPING — they never hold physical stock. Their supplier fulfills orders directly.
Negative stock = overselling (orders placed beyond available supplier stock).
Focus on: sales velocity, best sellers, fulfillment risk, products to pause or scale.
Do NOT recommend traditional "reorder quantities" — instead recommend actions like "pause listings", "increase marketing", "verify supplier availability".`,
      user: `Analyze the dropshipping catalog below for "${shopDomain}".

PRODUCTS (${inventoryItems.length} SKUs):
${JSON.stringify(inventoryItems, null, 2)}

SUPPLIERS (${supplierList.length} registered):
${JSON.stringify(supplierList, null, 2)}

Rules:
- status "critical" = stock ≤ 0 (risk of fulfillment failure — supplier may be out of stock)
- status "low" = stock 1–10 (monitor closely)
- status "ok" = stock > 10
- Negative stock values mean the merchant is overselling — flag as critical
- reorder_qty field = 0 for dropshipping (supplier fulfills on demand)
- Use reasoning to explain whether to pause the listing, contact the supplier, or scale marketing

Return this exact JSON:
{
  "summary": "Overview of dropshipping catalog health and fulfillment risks",
  "recommendations": [
    {
      "sku": "SKU",
      "product": "Product name",
      "current_stock": 0,
      "daily_velocity": 0,
      "days_remaining": 0,
      "status": "critical",
      "urgency": "critical",
      "supplier": "Supplier name or null",
      "supplier_email": "email or null",
      "reorder_qty": 0,
      "estimated_cost": null,
      "reasoning": "Action to take: pause listing / contact supplier / scale marketing"
    }
  ],
  "total_skus_analyzed": ${inventoryItems.length},
  "items_needing_attention": 0
}`,
    };
  }

  if (model === "hybrid") {
    return {
      system: `${base}
This merchant uses a HYBRID model — some products are held in own stock, others are dropshipped.
Apply inventory reorder logic to own-stock products and fulfillment-risk logic to dropshipped ones.
Distinguish based on whether the product has a matched supplier SKU.`,
      user: `Analyze the hybrid inventory below for "${shopDomain}".

PRODUCTS (${inventoryItems.length} SKUs):
${JSON.stringify(inventoryItems, null, 2)}

SUPPLIERS (${supplierList.length} registered):
${JSON.stringify(supplierList, null, 2)}

Rules:
- If a SKU matches a supplier's SKU list → treat as OWN STOCK: recommend reorder quantities
- If no supplier match → treat as DROPSHIPPING: focus on fulfillment risk
- status "critical" = stock ≤ 5 or negative
- status "low" = stock 6–20
- status "ok" = stock > 20

Return this exact JSON:
{
  "summary": "Overview combining stock reorder needs and dropshipping fulfillment risks",
  "recommendations": [
    {
      "sku": "SKU",
      "product": "Product name",
      "current_stock": 0,
      "daily_velocity": 0,
      "days_remaining": 0,
      "status": "critical",
      "urgency": "critical",
      "supplier": "Supplier name or null",
      "supplier_email": "email or null",
      "reorder_qty": 0,
      "estimated_cost": null,
      "reasoning": "Plain-language action recommendation"
    }
  ],
  "total_skus_analyzed": ${inventoryItems.length},
  "items_needing_attention": 0
}`,
    };
  }

  // Default: inventory
  return {
    system: `${base}
This merchant holds PHYSICAL INVENTORY and reorders from suppliers.
Focus on stock levels, reorder points, and supplier lead times.
Estimate daily_velocity from current stock context (if stock is very low relative to product type, assume higher velocity).
days_remaining = current_stock / daily_velocity (round to integer, min 0).
urgency: "critical" = days_remaining ≤ 3, "high" = 4–7 days, "medium" = 8–14 days, "low" = 15+ days.
estimated_cost = reorder_qty × price if price is known, else null.
Recommend specific reorder quantities sufficient for ~60 days of demand.`,
    user: `Analyze the inventory below for "${shopDomain}".

INVENTORY (${inventoryItems.length} SKUs):
${JSON.stringify(inventoryItems, null, 2)}

SUPPLIERS (${supplierList.length} registered):
${JSON.stringify(supplierList, null, 2)}

Rules:
- status "critical" = stock ≤ 5 units or out of stock
- status "low" = stock 6–20 units
- status "ok" = stock > 20 units
- Match each SKU to the supplier whose skus[] array contains that SKU; if no match, supplier is null
- reorder_qty should cover ~60 days of estimated demand at the estimated daily velocity

Return this exact JSON:
{
  "summary": "Overview of inventory health and urgent reorder needs",
  "recommendations": [
    {
      "sku": "SKU",
      "product": "Product name",
      "current_stock": 0,
      "daily_velocity": 0.5,
      "days_remaining": 10,
      "status": "critical",
      "urgency": "critical",
      "supplier": "Supplier name or null",
      "supplier_email": "email or null",
      "reorder_qty": 100,
      "estimated_cost": 450.00,
      "reasoning": "Plain-language explanation covering velocity, days remaining, and why this quantity"
    }
  ],
  "total_skus_analyzed": ${inventoryItems.length},
  "items_needing_attention": 0
}`,
  };
}

export async function POST() {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch business model from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_model, plan, analyses_count_month, analyses_reset_at")
    .eq("id", user.id)
    .maybeSingle();

  const businessModel: BusinessModel =
    (profile?.business_model as BusinessModel) ?? "inventory";

  const limits = getLimits(profile?.plan ?? "free");

  // Free plan: enforce monthly analysis limit
  if (limits.analysesPerMonth !== -1) {
    const now = new Date();
    const resetAt = new Date(profile?.analyses_reset_at ?? now);
    const sameMonth = resetAt.getMonth() === now.getMonth() &&
                      resetAt.getFullYear() === now.getFullYear();
    const count = sameMonth ? (profile?.analyses_count_month ?? 0) : 0;

    if (count >= limits.analysesPerMonth) {
      return NextResponse.json(
        { error: "Monthly analysis limit reached. Upgrade to run unlimited analyses.", upgrade: true },
        { status: 403 },
      );
    }

    // Increment counter
    await supabase.from("profiles").update({
      analyses_count_month: sameMonth ? count + 1 : 1,
      analyses_reset_at: sameMonth ? profile?.analyses_reset_at : now.toISOString(),
    }).eq("id", user.id);
  }

  // Free plan: enforce business model restriction
  if (!limits.allBusinessModels && businessModel !== "inventory") {
    return NextResponse.json(
      { error: "Upgrade to Starter or higher to use dropshipping and hybrid models." },
      { status: 403 },
    );
  }

  // 3. Fetch Shopify connection
  const { data: shopifyConn } = await supabase
    .from("shopify_connections")
    .select("shop_domain, access_token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!shopifyConn) {
    return NextResponse.json(
      { error: "No Shopify store connected. Complete onboarding first." },
      { status: 400 },
    );
  }

  // 4. Fetch suppliers
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("name, email, skus")
    .order("created_at", { ascending: false });

  // 5. Fetch Shopify inventory via Admin API
  let shopifyProducts: ShopifyProduct[] = [];
  try {
    const shopifyRes = await fetch(
      `https://${shopifyConn.shop_domain}/admin/api/2024-01/products.json?limit=250&status=active`,
      {
        headers: {
          "X-Shopify-Access-Token": shopifyConn.access_token,
          "Content-Type": "application/json",
        },
      },
    );

    if (!shopifyRes.ok) {
      const errText = await shopifyRes.text();
      console.error("Shopify API error:", shopifyRes.status, errText);
      return NextResponse.json(
        { error: "Failed to fetch Shopify inventory. Check store connection." },
        { status: 502 },
      );
    }

    const shopifyData = (await shopifyRes.json()) as ShopifyProductsResponse;
    shopifyProducts = shopifyData.products ?? [];
  } catch (err) {
    console.error("Shopify fetch error:", err);
    return NextResponse.json(
      { error: "Network error fetching Shopify data." },
      { status: 502 },
    );
  }

  // 6. Build inventory summary — apply SKU limit for free/starter plans
  const allInventoryItems = shopifyProducts.flatMap((p) =>
    p.variants
      .filter((v) => v.inventory_management === "shopify" || v.inventory_quantity !== null)
      .map((v) => ({
        product: p.title,
        sku: v.sku ?? `variant-${v.id}`,
        variant: v.title !== "Default Title" ? v.title : null,
        stock: v.inventory_quantity ?? 0,
        price: v.price,
      })),
  );

  const skuLimit = limits.maxSkus;
  const inventoryItems = skuLimit === -1
    ? allInventoryItems
    : allInventoryItems.slice(0, skuLimit);

  const skuLimitApplied = skuLimit !== -1 && allInventoryItems.length > skuLimit;

  const supplierList = (suppliers as SupplierRow[] ?? []).map((s) => ({
    name: s.name,
    email: s.email,
    skus: s.skus,
  }));

  // 7. Call Claude API — prompt varies by business model
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI engine not configured. Add ANTHROPIC_API_KEY to Vercel." },
      { status: 503 },
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const { system: systemPrompt, user: userPrompt } = buildPrompts(
    businessModel,
    shopifyConn.shop_domain,
    inventoryItems,  // already sliced to plan limit
    supplierList,
  );

  let analysisText = "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }
    analysisText = block.text.trim();
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 },
    );
  }

  // 7. Parse and return
  let result: Omit<AnalysisResult, "shop_domain" | "analyzed_at">;
  try {
    // Strip potential markdown code fences just in case
    const cleaned = analysisText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    result = JSON.parse(cleaned) as typeof result;
  } catch (err) {
    console.error("JSON parse error:", err, "\nRaw:", analysisText);
    return NextResponse.json(
      { error: "Failed to parse AI response. Please retry." },
      { status: 502 },
    );
  }

  const finalResult: AnalysisResult = {
    ...result,
    shop_domain: shopifyConn.shop_domain,
    analyzed_at: new Date().toISOString(),
    sku_limit_applied: skuLimitApplied,
    total_skus_in_store: allInventoryItems.length,
  };

  return NextResponse.json(finalResult);
}
