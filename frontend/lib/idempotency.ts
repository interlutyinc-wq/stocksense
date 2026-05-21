/**
 * Idempotency key management for critical operations.
 *
 * Prevents double-charges on Stripe and duplicate PO sends
 * by storing operation hashes in Supabase with TTL semantics.
 *
 * Pattern: hash(userId + operation + entityId) → store result → return cached on duplicate
 */

import { createHash } from "crypto";

// ── Key generation ────────────────────────────────────────────────────────────

/**
 * Generate a deterministic idempotency key for an operation.
 * The key is a SHA-256 hash of the input components — same inputs → same key.
 */
export function generateIdempotencyKey(
  ...components: (string | number | null | undefined)[]
): string {
  const input = components
    .map(c => (c === null || c === undefined ? "null" : String(c)))
    .join(":");
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

// ── Stripe idempotency ────────────────────────────────────────────────────────

/**
 * Generate a Stripe idempotency key for checkout sessions.
 * Stripe requires this to be unique per operation but consistent on retry.
 */
export function stripeIdempotencyKey(userId: string, plan: string): string {
  // Include date at day granularity — allows re-attempt after 24h
  const day = new Date().toISOString().slice(0, 10);
  return generateIdempotencyKey("checkout", userId, plan, day);
}

/**
 * Generate a Stripe idempotency key for customer creation.
 */
export function stripeCustomerKey(userId: string): string {
  return generateIdempotencyKey("customer", userId);
}

// ── PO idempotency ────────────────────────────────────────────────────────────

/**
 * Generate an idempotency key for purchase order creation.
 * Same merchant + supplier + SKU within the same hour = duplicate.
 */
export function poIdempotencyKey(
  userId: string,
  supplierEmail: string,
  sku: string
): string {
  // Hour-level granularity — prevents double-send within 60 minutes
  const hour = new Date().toISOString().slice(0, 13);
  return generateIdempotencyKey("po", userId, supplierEmail, sku, hour);
}
