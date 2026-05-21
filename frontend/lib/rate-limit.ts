/**
 * Sliding-window rate limiter for StockSense API routes.
 *
 * Uses an in-process LRU store on serverless (resets per cold start) —
 * suitable for MVP. Replace the store with Upstash Redis for distributed
 * rate limiting across multiple instances at scale.
 *
 * Usage:
 *   const result = await rateLimit(request, { requests: 10, window: 60 });
 *   if (!result.success) return rateLimitResponse(result);
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests allowed in the window. */
  requests: number;
  /** Window duration in seconds. */
  window: number;
  /** Optional key prefix for namespacing (e.g. "analyze", "checkout"). */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
  identifier: string;
}

// ── In-process sliding window store ──────────────────────────────────────────
// Each entry: array of request timestamps within the current window.

interface WindowEntry {
  timestamps: number[];
  expiresAt: number;
}

const store = new Map<string, WindowEntry>();

// Periodic cleanup to avoid unbounded memory growth
let lastCleanup = Date.now();
function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // cleanup at most once per minute
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

// ── Identifier extraction ─────────────────────────────────────────────────────

function extractIdentifier(request: Request | NextRequest): string {
  // Prefer authenticated user ID if available via header (set by middleware)
  const userId = "headers" in request
    ? (request as NextRequest).headers.get("x-user-id")
    : null;
  if (userId) return `uid:${userId}`;

  // Fall back to IP address
  const forwarded = "headers" in request
    ? (request as NextRequest).headers.get("x-forwarded-for")
    : null;
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `ip:${ip}`;
}

// ── Core rate limit function ──────────────────────────────────────────────────

export async function rateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  maybeCleanup();

  const { requests, window: windowSecs, prefix = "default" } = config;
  const identifier = extractIdentifier(request);
  const key = `${prefix}:${identifier}`;
  const windowMs = windowSecs * 1000;
  const now = Date.now();
  const windowStart = now - windowMs;
  const resetAt = Math.ceil(now / 1000) + windowSecs;

  let entry = store.get(key);

  if (!entry || entry.expiresAt < now) {
    // New window
    entry = { timestamps: [now], expiresAt: now + windowMs };
    store.set(key, entry);
    return { success: true, limit: requests, remaining: requests - 1, reset: resetAt, identifier };
  }

  // Prune timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
  entry.expiresAt = now + windowMs;

  const count = entry.timestamps.length;

  if (count >= requests) {
    return { success: false, limit: requests, remaining: 0, reset: resetAt, identifier };
  }

  entry.timestamps.push(now);
  return { success: true, limit: requests, remaining: requests - count - 1, reset: resetAt, identifier };
}

// ── Response helper ───────────────────────────────────────────────────────────

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down.",
      code: "RATE_LIMIT_EXCEEDED",
      retry_after: result.reset - Math.floor(Date.now() / 1000),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit":     String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset":     String(result.reset),
        "Retry-After":           String(result.reset - Math.floor(Date.now() / 1000)),
      },
    }
  );
}

// ── Preset configurations ─────────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** AI analysis — expensive, limit tightly. */
  analyze:   { requests: 5,   window: 60,   prefix: "analyze"   } satisfies RateLimitConfig,
  /** PO sending — moderate limit. */
  sendPO:    { requests: 20,  window: 60,   prefix: "send-po"   } satisfies RateLimitConfig,
  /** Stripe checkout — prevent abuse. */
  checkout:  { requests: 10,  window: 300,  prefix: "checkout"  } satisfies RateLimitConfig,
  /** Waitlist — prevent spam. */
  waitlist:  { requests: 3,   window: 3600, prefix: "waitlist"  } satisfies RateLimitConfig,
  /** General API — broad limit. */
  general:   { requests: 100, window: 60,   prefix: "general"   } satisfies RateLimitConfig,
} as const;
