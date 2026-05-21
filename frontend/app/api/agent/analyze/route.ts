import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLimits } from "@/lib/plans";
import { NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Tool definitions ──────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "get_inventory",
    description: "Fetch current inventory levels for all products from the connected store.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max SKUs to fetch (default: all)" },
      },
      required: [],
    },
  },
  {
    name: "get_sales_velocity",
    description: "Calculate daily sales velocity for a SKU based on order history.",
    input_schema: {
      type: "object" as const,
      properties: {
        sku: { type: "string", description: "The SKU to analyze" },
        days: { type: "number", description: "Number of days to look back (default: 30)" },
      },
      required: ["sku"],
    },
  },
  {
    name: "get_supplier_history",
    description: "Get historical PO data and real lead times for a supplier.",
    input_schema: {
      type: "object" as const,
      properties: {
        supplier_name: { type: "string", description: "Supplier name" },
      },
      required: ["supplier_name"],
    },
  },
  {
    name: "get_supplier_list",
    description: "Get all registered suppliers with their SKU mappings.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "save_analysis",
    description: "Save the completed analysis to memory for future reference.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string" },
        recommendations: { type: "array", items: { type: "object" } },
        total_skus: { type: "number" },
        critical_count: { type: "number" },
      },
      required: ["summary", "recommendations", "total_skus", "critical_count"],
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    userId: string;
    shopDomain: string;
    accessToken: string;
    skuLimit: number;
    allInventory: InventoryItem[];
    suppliers: SupplierRow[];
  }
): Promise<string> {
  const { supabase, userId, shopDomain, accessToken, skuLimit, allInventory, suppliers } = context;

  switch (toolName) {
    case "get_inventory": {
      const limit = (toolInput.limit as number) ?? skuLimit;
      const items = limit === -1 ? allInventory : allInventory.slice(0, limit);
      return JSON.stringify({ items, total: allInventory.length, shown: items.length });
    }

    case "get_sales_velocity": {
      const sku = toolInput.sku as string;
      const days = (toolInput.days as number) ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Fetch order history from Shopify
      try {
        const res = await fetch(
          `https://${shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${since.toISOString()}&limit=250&fields=line_items`,
          { headers: { "X-Shopify-Access-Token": accessToken } }
        );
        if (!res.ok) return JSON.stringify({ sku, daily_velocity: 0, error: "Could not fetch orders" });

        const data = await res.json() as { orders: { line_items: { sku: string; quantity: number }[] }[] };
        let totalSold = 0;
        for (const order of data.orders ?? []) {
          for (const item of order.line_items ?? []) {
            if (item.sku === sku) totalSold += item.quantity;
          }
        }
        const velocity = Math.round((totalSold / days) * 100) / 100;
        return JSON.stringify({ sku, daily_velocity: velocity, total_sold: totalSold, period_days: days });
      } catch {
        return JSON.stringify({ sku, daily_velocity: 0, error: "Network error" });
      }
    }

    case "get_supplier_history": {
      const supplierName = toolInput.supplier_name as string;
      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("sku, quantity, created_at, sent_at, status")
        .eq("user_id", userId)
        .eq("supplier_name", supplierName)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: metrics } = await supabase
        .from("supplier_metrics")
        .select("avg_lead_days, reliability_score, total_pos")
        .eq("user_id", userId)
        .eq("supplier_name", supplierName)
        .maybeSingle();

      return JSON.stringify({
        supplier: supplierName,
        past_orders: pos ?? [],
        metrics: metrics ?? { avg_lead_days: null, reliability_score: null, total_pos: 0 },
      });
    }

    case "get_supplier_list": {
      return JSON.stringify({ suppliers });
    }

    case "save_analysis": {
      await supabase.from("analysis_history").insert({
        user_id: userId,
        shop_domain: shopDomain,
        recommendations: toolInput.recommendations as Record<string, unknown>[],
        total_skus: toolInput.total_skus as number,
        critical_count: toolInput.critical_count as number,
        summary: toolInput.summary as string,
      });
      return JSON.stringify({ saved: true });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ── Inventory item type ───────────────────────────────────────────────────────

interface InventoryItem {
  product: string;
  sku: string;
  variant: string | null;
  stock: number;
  price: string;
}

interface SupplierRow {
  name: string;
  email: string;
  skus: string[];
}

interface ShopifyProduct {
  id: number;
  title: string;
  variants: {
    id: number;
    sku: string | null;
    title: string;
    price: string;
    inventory_quantity: number | null;
    inventory_management: string | null;
  }[];
}

// ── System prompt by business model ──────────────────────────────────────────

function getSystemPrompt(model: string, shopDomain: string): string {
  const base = `You are StockSense, an AI agent for supply chain management.
You have access to tools to analyze inventory, sales velocity, and supplier history.
Use tools to gather real data before making recommendations.
Always explain your reasoning in plain language. Be specific and actionable.
When you have enough data, use save_analysis to store your findings.
Return your final answer as a JSON object with this structure:
{
  "summary": "1-2 sentence overview",
  "recommendations": [
    {
      "sku": "string",
      "product": "string",
      "current_stock": number,
      "daily_velocity": number,
      "days_remaining": number,
      "status": "critical|low|ok",
      "urgency": "critical|high|medium|low",
      "supplier": "string or null",
      "supplier_email": "string or null",
      "reorder_qty": number,
      "estimated_cost": number or null,
      "reasoning": "plain language explanation"
    }
  ],
  "total_skus_analyzed": number,
  "items_needing_attention": number
}`;

  if (model === "dropshipping") {
    return `${base}

This merchant uses DROPSHIPPING. Never hold physical stock.
Negative stock = overselling risk. Focus on fulfillment risk and velocity.
reorder_qty = 0 for dropshipping. Recommend actions: pause listing, contact supplier, scale marketing.`;
  }

  if (model === "hybrid") {
    return `${base}

HYBRID model: some products are own-stock, others are dropshipped.
Match SKUs to supplier list to determine which model applies per product.`;
  }

  return `${base}

This merchant holds PHYSICAL INVENTORY. Focus on:
- urgency: critical = days_remaining ≤ 3, high = 4-7, medium = 8-14, low = 15+
- reorder_qty = enough for ~60 days at current velocity
- estimated_cost = reorder_qty × unit_price if known`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Profile + plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_model, plan, analyses_count_month, analyses_reset_at")
    .eq("id", user.id)
    .maybeSingle();

  const businessModel = (profile?.business_model ?? "inventory") as string;
  const limits = getLimits(profile?.plan ?? "free");

  // Monthly limit check
  if (limits.analysesPerMonth !== -1) {
    const now = new Date();
    const resetAt = new Date(profile?.analyses_reset_at ?? now);
    const sameMonth = resetAt.getMonth() === now.getMonth() && resetAt.getFullYear() === now.getFullYear();
    const count = sameMonth ? (profile?.analyses_count_month ?? 0) : 0;
    if (count >= limits.analysesPerMonth) {
      return NextResponse.json(
        { error: "Monthly analysis limit reached. Upgrade to run unlimited analyses.", upgrade: true },
        { status: 403 }
      );
    }
    await supabase.from("profiles").update({
      analyses_count_month: sameMonth ? count + 1 : 1,
      analyses_reset_at: sameMonth ? profile?.analyses_reset_at : now.toISOString(),
    }).eq("id", user.id);
  }

  // Business model gate
  if (!limits.allBusinessModels && businessModel !== "inventory") {
    return NextResponse.json(
      { error: "Upgrade to Starter or higher to use dropshipping and hybrid models." },
      { status: 403 }
    );
  }

  // Shopify connection
  const { data: shopifyConn } = await supabase
    .from("shopify_connections")
    .select("shop_domain, access_token")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!shopifyConn) {
    return NextResponse.json({ error: "No Shopify store connected." }, { status: 400 });
  }

  // Suppliers
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("name, email, skus")
    .order("created_at", { ascending: false });

  // Fetch all inventory upfront (used by get_inventory tool)
  let allInventory: InventoryItem[] = [];
  try {
    const res = await fetch(
      `https://${shopifyConn.shop_domain}/admin/api/2024-01/products.json?limit=250&status=active`,
      { headers: { "X-Shopify-Access-Token": shopifyConn.access_token } }
    );
    if (res.ok) {
      const data = await res.json() as { products: ShopifyProduct[] };
      allInventory = (data.products ?? []).flatMap(p =>
        p.variants
          .filter(v => v.inventory_management === "shopify" || v.inventory_quantity !== null)
          .map(v => ({
            product: p.title,
            sku: v.sku ?? `variant-${v.id}`,
            variant: v.title !== "Default Title" ? v.title : null,
            stock: v.inventory_quantity ?? 0,
            price: v.price,
          }))
      );
    }
  } catch {
    return NextResponse.json({ error: "Failed to fetch Shopify inventory." }, { status: 502 });
  }

  const skuLimit = limits.maxSkus;
  const skuLimitApplied = skuLimit !== -1 && allInventory.length > skuLimit;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI engine not configured." }, { status: 503 });

  const anthropic = new Anthropic({ apiKey });
  const toolContext = {
    supabase,
    userId: user.id,
    shopDomain: shopifyConn.shop_domain,
    accessToken: shopifyConn.access_token,
    skuLimit,
    allInventory,
    suppliers: (suppliers ?? []) as SupplierRow[],
  };

  // ── Agent loop with tool calling ──────────────────────────────────────────
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Analyze the inventory for store "${shopifyConn.shop_domain}".
Business model: ${businessModel}.
${skuLimit !== -1 ? `SKU limit for this plan: ${skuLimit} SKUs.` : "No SKU limit."}

Steps:
1. Use get_inventory to see current stock levels
2. For critical/low SKUs, use get_sales_velocity to get real velocity data
3. Use get_supplier_list to match SKUs to suppliers
4. For known suppliers, use get_supplier_history to get real lead times
5. Generate recommendations with full reasoning
6. Use save_analysis to store your findings
7. Return the final JSON analysis`,
    },
  ];

  let finalText = "";
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: getSystemPrompt(businessModel, shopifyConn.shop_domain),
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extract final text
      for (const block of response.content) {
        if (block.type === "text") {
          finalText = block.text;
        }
      }
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            toolContext
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  // Parse final JSON
  let result: Omit<AnalysisResult, "shop_domain" | "analyzed_at">;
  try {
    const cleaned = finalText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Extract JSON from text if wrapped in explanation
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    result = JSON.parse(jsonMatch[0]) as typeof result;
  } catch {
    return NextResponse.json({ error: "Failed to parse agent response. Please retry." }, { status: 502 });
  }

  // Save inventory snapshot for future velocity calculations
  if (allInventory.length > 0) {
    const snapshots = allInventory.slice(0, 100).map(item => ({
      user_id: user.id,
      shop_domain: shopifyConn.shop_domain,
      sku: item.sku,
      stock_level: item.stock,
    }));
    await supabase.from("inventory_snapshots").insert(snapshots).then(() => {});
  }

  return NextResponse.json({
    ...result,
    shop_domain: shopifyConn.shop_domain,
    analyzed_at: new Date().toISOString(),
    sku_limit_applied: skuLimitApplied,
    total_skus_in_store: allInventory.length,
  });
}
