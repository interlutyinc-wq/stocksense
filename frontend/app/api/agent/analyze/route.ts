import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
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
  status: "critical" | "low" | "ok";
  supplier: string | null;
  supplier_email: string | null;
  reorder_qty: number;
  reasoning: string;
}

export interface AnalysisResult {
  summary: string;
  recommendations: Recommendation[];
  total_skus_analyzed: number;
  items_needing_attention: number;
  shop_domain: string;
  analyzed_at: string;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST() {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch Shopify connection
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

  // 3. Fetch suppliers
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("name, email, skus")
    .order("created_at", { ascending: false });

  // 4. Fetch Shopify inventory via Admin API
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

  // 5. Build inventory summary for the prompt
  const inventoryItems = shopifyProducts.flatMap((p) =>
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

  const supplierList = (suppliers as SupplierRow[] ?? []).map((s) => ({
    name: s.name,
    email: s.email,
    skus: s.skus,
  }));

  // 6. Call Claude API
  // Using claude-haiku-4-5 for cost efficiency on the MVP tier ($5 credits)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI engine not configured. Add ANTHROPIC_API_KEY to Vercel." },
      { status: 503 },
    );
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are StockSense, an AI-native supply chain agent for e-commerce merchants.
Your job is to reason through inventory data and generate clear, actionable reorder recommendations.
Always explain your reasoning in plain language. Be specific about quantities, urgency, and supplier.
Return ONLY valid JSON — no markdown, no code fences, no preamble.`;

  const userPrompt = `Analyze the inventory below for the Shopify store "${shopifyConn.shop_domain}".

INVENTORY (${inventoryItems.length} SKUs):
${JSON.stringify(inventoryItems, null, 2)}

SUPPLIERS (${supplierList.length} registered):
${JSON.stringify(supplierList, null, 2)}

Rules for recommendations:
- status "critical" = stock ≤ 5 units or out of stock
- status "low" = stock 6–20 units
- status "ok" = stock > 20 units (include in analysis but no urgent action needed)
- Match each SKU to the supplier whose skus[] array contains that SKU; if no match, supplier is null
- reorder_qty should be enough for ~60 days of estimated demand (use stock level as a proxy)
- Focus recommendations on "critical" and "low" items first

Respond with this exact JSON structure (no extras):
{
  "summary": "1-2 sentence overview of the overall inventory health",
  "recommendations": [
    {
      "sku": "SKU code",
      "product": "Product name",
      "current_stock": 0,
      "status": "critical",
      "supplier": "Supplier name or null",
      "supplier_email": "email or null",
      "reorder_qty": 100,
      "reasoning": "Plain-language explanation of why and how much to reorder"
    }
  ],
  "total_skus_analyzed": ${inventoryItems.length},
  "items_needing_attention": 0
}`;

  let analysisText = "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
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
  };

  return NextResponse.json(finalResult);
}
