import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getLimits } from "@/lib/plans";
import { NextResponse } from "next/server";
import type { Recommendation } from "@/app/api/agent/analyze/route";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── SSE Event types ───────────────────────────────────────────────────────────

type AgentEvent =
  | { type: "agent:start";        message: string }
  | { type: "agent:tool_call";    tool: string; message: string; input?: Record<string, unknown> }
  | { type: "agent:tool_result";  tool: string; message: string; data?: Record<string, unknown> }
  | { type: "agent:thinking";     message: string }
  | { type: "agent:complete";     result: AgentStreamResult }
  | { type: "agent:error";        message: string; code?: string };

interface AgentStreamResult {
  summary: string;
  recommendations: Recommendation[];
  total_skus_analyzed: number;
  items_needing_attention: number;
  shop_domain: string;
  analyzed_at: string;
  sku_limit_applied?: boolean;
  total_skus_in_store?: number;
}

// ── Inventory types ───────────────────────────────────────────────────────────

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

// ── Tool definitions (same as analyze route) ──────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "get_inventory",
    description: "Fetch current inventory levels for all products from the connected store.",
    input_schema: { type: "object" as const, properties: { limit: { type: "number" } }, required: [] },
  },
  {
    name: "get_sales_velocity",
    description: "Calculate real daily sales velocity for a SKU from order history.",
    input_schema: {
      type: "object" as const,
      properties: {
        sku: { type: "string" },
        days: { type: "number", description: "Lookback period in days (default: 30)" },
      },
      required: ["sku"],
    },
  },
  {
    name: "get_supplier_history",
    description: "Get real lead times and past PO data for a supplier.",
    input_schema: {
      type: "object" as const,
      properties: { supplier_name: { type: "string" } },
      required: ["supplier_name"],
    },
  },
  {
    name: "get_supplier_list",
    description: "Get all registered suppliers with their SKU mappings.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "save_analysis",
    description: "Persist the completed analysis to agent memory.",
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

// ── Human-readable tool messages ──────────────────────────────────────────────

function toolStartMessage(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "get_inventory":
      return input.limit
        ? `Fetching first ${input.limit} SKUs from Shopify...`
        : "Fetching full inventory from Shopify...";
    case "get_sales_velocity":
      return `Calculating sales velocity for SKU "${input.sku}" over last ${input.days ?? 30} days...`;
    case "get_supplier_history":
      return `Loading PO history and lead times for supplier "${input.supplier_name}"...`;
    case "get_supplier_list":
      return "Loading registered suppliers and SKU mappings...";
    case "save_analysis":
      return "Saving analysis to agent memory...";
    default:
      return `Executing ${toolName}...`;
  }
}

function toolResultMessage(toolName: string, result: string): string {
  try {
    const data = JSON.parse(result) as Record<string, unknown>;
    switch (toolName) {
      case "get_inventory": {
        const total = data.total as number;
        const shown = data.shown as number;
        return `Found ${total} SKUs${shown < total ? ` (analyzing first ${shown} for your plan)` : ""}.`;
      }
      case "get_sales_velocity": {
        const v = data.daily_velocity as number;
        const sold = data.total_sold as number;
        return v > 0
          ? `Velocity: ${v} units/day (${sold} sold in ${data.period_days} days).`
          : "No recent sales data found for this SKU.";
      }
      case "get_supplier_history": {
        const metrics = data.metrics as Record<string, unknown>;
        const pos = (data.past_orders as unknown[]).length;
        return metrics.avg_lead_days
          ? `Found ${pos} past orders. Avg lead time: ${metrics.avg_lead_days} days.`
          : `Found ${pos} past orders. No lead time data yet.`;
      }
      case "get_supplier_list": {
        const suppliers = data.suppliers as SupplierRow[];
        return `Loaded ${suppliers.length} supplier${suppliers.length !== 1 ? "s" : ""}.`;
      }
      case "save_analysis":
        return "Analysis saved to memory.";
      default:
        return "Done.";
    }
  } catch {
    return "Done.";
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function getSystemPrompt(model: string): string {
  const base = `You are StockSense, an AI agent for supply chain management.
Use your tools to gather real data. Think step by step.
Start with get_inventory, then get_sales_velocity for critical SKUs, check supplier data.
Always explain reasoning in plain language. Save analysis when complete.
Return final JSON:
{
  "summary": "string",
  "recommendations": [{
    "sku": "string", "product": "string",
    "current_stock": number, "daily_velocity": number, "days_remaining": number,
    "status": "critical|low|ok", "urgency": "critical|high|medium|low",
    "supplier": "string|null", "supplier_email": "string|null",
    "reorder_qty": number, "estimated_cost": number|null, "reasoning": "string"
  }],
  "total_skus_analyzed": number, "items_needing_attention": number
}`;

  if (model === "dropshipping") return `${base}\nDROPSHIPPING: focus on fulfillment risk, reorder_qty=0.`;
  if (model === "hybrid") return `${base}\nHYBRID: apply inventory logic to own-stock SKUs, dropshipping logic to others.`;
  return `${base}\nINVENTORY: urgency critical≤3d, high=4-7d, medium=8-14d. reorder_qty covers ~60 days.`;
}

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    supabase: Awaited<ReturnType<typeof createClient>>;
    userId: string;
    shopDomain: string;
    accessToken: string;
    skuLimit: number;
    allInventory: InventoryItem[];
    suppliers: SupplierRow[];
  }
): Promise<string> {
  switch (toolName) {
    case "get_inventory": {
      const limit = (input.limit as number) ?? (ctx.skuLimit === -1 ? ctx.allInventory.length : ctx.skuLimit);
      const items = ctx.allInventory.slice(0, limit);
      return JSON.stringify({ items, total: ctx.allInventory.length, shown: items.length });
    }
    case "get_sales_velocity": {
      const sku = input.sku as string;
      const days = (input.days as number) ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      try {
        const res = await fetch(
          `https://${ctx.shopDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${since.toISOString()}&limit=250&fields=line_items`,
          { headers: { "X-Shopify-Access-Token": ctx.accessToken }, signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return JSON.stringify({ sku, daily_velocity: 0 });
        const data = await res.json() as { orders: { line_items: { sku: string; quantity: number }[] }[] };
        let totalSold = 0;
        for (const order of data.orders ?? [])
          for (const item of order.line_items ?? [])
            if (item.sku === sku) totalSold += item.quantity;
        return JSON.stringify({ sku, daily_velocity: Math.round((totalSold / days) * 100) / 100, total_sold: totalSold, period_days: days });
      } catch {
        return JSON.stringify({ sku, daily_velocity: 0 });
      }
    }
    case "get_supplier_history": {
      const name = input.supplier_name as string;
      const [{ data: pos }, { data: metrics }] = await Promise.all([
        ctx.supabase.from("purchase_orders").select("sku, quantity, created_at, status")
          .eq("user_id", ctx.userId).eq("supplier_name", name).order("created_at", { ascending: false }).limit(20),
        ctx.supabase.from("supplier_metrics").select("avg_lead_days, reliability_score, total_pos")
          .eq("user_id", ctx.userId).eq("supplier_name", name).maybeSingle(),
      ]);
      return JSON.stringify({ supplier: name, past_orders: pos ?? [], metrics: metrics ?? {} });
    }
    case "get_supplier_list":
      return JSON.stringify({ suppliers: ctx.suppliers });
    case "save_analysis":
      await ctx.supabase.from("analysis_history").insert({
        user_id: ctx.userId, shop_domain: ctx.shopDomain,
        recommendations: input.recommendations as Record<string, unknown>[],
        total_skus: input.total_skus as number,
        critical_count: input.critical_count as number,
        summary: input.summary as string,
      });
      return JSON.stringify({ saved: true });
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Client disconnected
        }
      };

      try {
        emit({ type: "agent:start", message: "StockSense agent initializing..." });

        // ── Auth & plan check ──────────────────────────────────────────────
        const { data: profile } = await supabase
          .from("profiles")
          .select("business_model, plan, analyses_count_month, analyses_reset_at")
          .eq("id", user.id)
          .maybeSingle();

        const businessModel = (profile?.business_model ?? "inventory") as string;
        const limits = getLimits(profile?.plan ?? "free");

        if (limits.analysesPerMonth !== -1) {
          const now = new Date();
          const resetAt = new Date(profile?.analyses_reset_at ?? now);
          const sameMonth = resetAt.getMonth() === now.getMonth() && resetAt.getFullYear() === now.getFullYear();
          const count = sameMonth ? (profile?.analyses_count_month ?? 0) : 0;
          if (count >= limits.analysesPerMonth) {
            emit({ type: "agent:error", message: "Monthly analysis limit reached. Upgrade to continue.", code: "LIMIT_REACHED" });
            controller.close();
            return;
          }
          await supabase.from("profiles").update({
            analyses_count_month: sameMonth ? count + 1 : 1,
            analyses_reset_at: sameMonth ? profile?.analyses_reset_at : now.toISOString(),
          }).eq("id", user.id);
        }

        // ── Shopify connection ─────────────────────────────────────────────
        const { data: conn } = await supabase
          .from("shopify_connections")
          .select("shop_domain, access_token")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conn) {
          emit({ type: "agent:error", message: "No Shopify store connected.", code: "NO_STORE" });
          controller.close();
          return;
        }

        emit({ type: "agent:thinking", message: `Connected to ${conn.shop_domain}. Preparing analysis...` });

        // ── Suppliers ──────────────────────────────────────────────────────
        const { data: suppliers } = await supabase
          .from("suppliers").select("name, email, skus").order("created_at", { ascending: false });

        // ── Pre-fetch inventory ────────────────────────────────────────────
        emit({ type: "agent:thinking", message: "Connecting to Shopify Admin API..." });

        let allInventory: InventoryItem[] = [];
        const shopifyRes = await fetch(
          `https://${conn.shop_domain}/admin/api/2024-01/products.json?limit=250&status=active`,
          { headers: { "X-Shopify-Access-Token": conn.access_token } }
        );
        if (shopifyRes.ok) {
          const shopData = await shopifyRes.json() as { products: ShopifyProduct[] };
          allInventory = (shopData.products ?? []).flatMap(p =>
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

        const skuLimit = limits.maxSkus;
        const skuLimitApplied = skuLimit !== -1 && allInventory.length > skuLimit;

        emit({
          type: "agent:thinking",
          message: `Loaded ${allInventory.length} SKUs from ${conn.shop_domain}. Starting agent reasoning...`,
        });

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          emit({ type: "agent:error", message: "AI engine not configured.", code: "NO_API_KEY" });
          controller.close();
          return;
        }

        // ── Agent loop ─────────────────────────────────────────────────────
        const anthropic = new Anthropic({ apiKey });
        const toolCtx = {
          supabase, userId: user.id, shopDomain: conn.shop_domain,
          accessToken: conn.access_token, skuLimit, allInventory,
          suppliers: (suppliers ?? []) as SupplierRow[],
        };

        const messages: Anthropic.MessageParam[] = [{
          role: "user",
          content: `Analyze inventory for "${conn.shop_domain}". Business model: ${businessModel}.
${skuLimit !== -1 ? `Plan SKU limit: ${skuLimit}.` : "No SKU limit."}
Use tools to gather real data, then provide recommendations.`,
        }];

        let finalText = "";
        let iterations = 0;

        while (iterations < 10) {
          iterations++;

          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: getSystemPrompt(businessModel),
            tools,
            messages,
          });

          messages.push({ role: "assistant", content: response.content });

          // Stream thinking blocks
          for (const block of response.content) {
            if (block.type === "text" && block.text.trim() && response.stop_reason !== "end_turn") {
              emit({ type: "agent:thinking", message: block.text.slice(0, 200) });
            }
          }

          if (response.stop_reason === "end_turn") {
            for (const block of response.content)
              if (block.type === "text") finalText = block.text;
            break;
          }

          if (response.stop_reason === "tool_use") {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type !== "tool_use") continue;

              const input = block.input as Record<string, unknown>;

              emit({
                type: "agent:tool_call",
                tool: block.name,
                message: toolStartMessage(block.name, input),
                input,
              });

              const result = await executeTool(block.name, input, toolCtx);

              emit({
                type: "agent:tool_result",
                tool: block.name,
                message: toolResultMessage(block.name, result),
              });

              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
            }

            messages.push({ role: "user", content: toolResults });
          }
        }

        // ── Parse & emit final result ──────────────────────────────────────
        const cleaned = finalText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          emit({ type: "agent:error", message: "Agent could not generate recommendations. Please retry.", code: "PARSE_ERROR" });
          controller.close();
          return;
        }

        const parsed = JSON.parse(jsonMatch[0]) as Omit<AgentStreamResult, "shop_domain" | "analyzed_at">;

        // Save inventory snapshot
        if (allInventory.length > 0) {
          await supabase.from("inventory_snapshots").insert(
            allInventory.slice(0, 100).map(item => ({
              user_id: user.id, shop_domain: conn.shop_domain,
              sku: item.sku, stock_level: item.stock,
            }))
          );
        }

        emit({
          type: "agent:complete",
          result: {
            ...parsed,
            shop_domain: conn.shop_domain,
            analyzed_at: new Date().toISOString(),
            sku_limit_applied: skuLimitApplied,
            total_skus_in_store: allInventory.length,
          },
        });

      } catch (err) {
        emit({
          type: "agent:error",
          message: err instanceof Error ? err.message : "Unexpected error. Please retry.",
          code: "INTERNAL_ERROR",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
