/**
 * Centralised Zod schemas for all API route inputs.
 * Every external input passes through one of these schemas before touching business logic.
 */

import { z } from "zod";
import { NextResponse } from "next/server";

// ── Primitive helpers ──────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254, "Email too long")
  .transform(v => v.trim().toLowerCase());

export const skuSchema = z
  .string()
  .min(1, "SKU cannot be empty")
  .max(100, "SKU too long")
  .transform(v => v.trim());

// ── Stripe schemas ─────────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  plan: z.enum(["starter", "pro", "agency"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ── Purchase Order schemas ─────────────────────────────────────────────────────

export const sendPOSchema = z.object({
  supplierName:  z.string().min(1).max(200).transform(v => v.trim()),
  supplierEmail: emailSchema,
  productName:   z.string().min(1).max(500).transform(v => v.trim()),
  sku:           skuSchema,
  quantity:      z.number().int().positive().max(100_000),
  estimatedCost: z.number().min(0).nullable().default(null),
  urgency:       z.enum(["critical", "high", "medium", "low"]).default("medium"),
  reasoning:     z.string().max(2000).default("").transform(v => v.trim()),
});

export type SendPOInput = z.infer<typeof sendPOSchema>;

// ── Waitlist schemas ───────────────────────────────────────────────────────────

export const waitlistSchema = z.object({
  email: emailSchema,
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

// ── Report schemas ─────────────────────────────────────────────────────────────

const recommendationSchema = z.object({
  sku:             skuSchema,
  product:         z.string().min(1).max(500),
  current_stock:   z.number().int(),
  daily_velocity:  z.number().min(0),
  days_remaining:  z.number().int(),
  status:          z.enum(["critical", "low", "ok"]),
  urgency:         z.enum(["critical", "high", "medium", "low"]),
  supplier:        z.string().nullable(),
  supplier_email:  z.string().email().nullable(),
  reorder_qty:     z.number().int().min(0),
  estimated_cost:  z.number().min(0).nullable(),
  reasoning:       z.string().max(2000),
});

export const shareReportSchema = z.object({
  result: z.object({
    summary:                  z.string().min(1).max(1000),
    recommendations:          z.array(recommendationSchema).max(500),
    total_skus_analyzed:      z.number().int().min(0),
    items_needing_attention:  z.number().int().min(0),
    shop_domain:              z.string().min(1),
    analyzed_at:              z.string(),
    sku_limit_applied:        z.boolean().optional(),
    total_skus_in_store:      z.number().int().min(0).optional(),
  }),
});

export type ShareReportInput = z.infer<typeof shareReportSchema>;

// ── Validation helper ──────────────────────────────────────────────────────────

export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body", code: "INVALID_JSON" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues;
    const first = issues[0];
    return {
      error: NextResponse.json(
        {
          error: first?.message ?? "Validation failed",
          code: "VALIDATION_ERROR",
          field: first?.path.join("."),
          issues: issues.map(i => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 422 }
      ),
    };
  }

  return { data: result.data };
}
