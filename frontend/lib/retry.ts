/**
 * Exponential backoff retry utility for external API calls.
 *
 * Retries failed operations with configurable delays, jitter,
 * and per-error-class abort conditions. Designed for Shopify,
 * Anthropic, and Stripe API calls in serverless environments.
 *
 * Usage:
 *   const data = await withRetry(() => shopifyFetch(url), {
 *     attempts: 3,
 *     baseDelay: 500,
 *     shouldRetry: isTransientError,
 *   });
 */

import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of attempts (including the first). Default: 3 */
  attempts?: number;
  /** Base delay in ms before first retry. Doubles each attempt. Default: 500 */
  baseDelay?: number;
  /** Maximum delay cap in ms. Default: 10_000 */
  maxDelay?: number;
  /** Add random jitter (±30% of delay) to prevent thundering herd. Default: true */
  jitter?: boolean;
  /** Called with the error to decide whether to retry. Default: retries all errors. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Called after each failed attempt with attempt number and delay. */
  onRetry?: (err: unknown, attempt: number, delay: number) => void;
  /** Label for logging. */
  label?: string;
}

// ── Transient error classifiers ────────────────────────────────────────────────

/** Shopify API: retry on 429 (rate limit) and 5xx (server errors). */
export function isShopifyTransient(err: unknown): boolean {
  if (err instanceof Response) return err.status === 429 || err.status >= 500;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("rate limit") || msg.includes("503") || msg.includes("504") || msg.includes("timeout");
  }
  return false;
}

/** Anthropic API: retry on overload and rate limit errors. */
export function isAnthropicTransient(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("overloaded") ||
      msg.includes("rate limit") ||
      msg.includes("529") ||
      msg.includes("503") ||
      msg.includes("timeout")
    );
  }
  return false;
}

/** Generic network transient error. */
export function isNetworkTransient(err: unknown): boolean {
  if (err instanceof TypeError && err.message === "fetch failed") return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("enotfound");
  }
  return false;
}

// ── Delay calculation ──────────────────────────────────────────────────────────

function computeDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: boolean): number {
  // Exponential: baseDelay * 2^(attempt-1)
  const exponential = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  if (!jitter) return exponential;
  // Full jitter: random in [0.7 * delay, 1.3 * delay]
  const factor = 0.7 + Math.random() * 0.6;
  return Math.round(exponential * factor);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Core retry function ────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelay = 500,
    maxDelay = 10_000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
    label = "operation",
  } = config;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLast = attempt === attempts;
      const willRetry = !isLast && shouldRetry(err, attempt);

      if (!willRetry) {
        logger.error(`${label} failed after ${attempt} attempt(s)`, err as Error, { attempt, label });
        throw err;
      }

      const delay = computeDelay(attempt, baseDelay, maxDelay, jitter);

      logger.warn(`${label} failed — retrying in ${delay}ms`, {
        attempt,
        label,
        error: err instanceof Error ? err.message : String(err),
        next_attempt: attempt + 1,
      });

      onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

// ── Shopify-specific fetch with retry ─────────────────────────────────────────

export async function shopifyFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const res = await fetch(url, {
        ...options,
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: options.signal ?? AbortSignal.timeout(15_000),
      });

      // Treat 429 and 5xx as retryable errors by throwing
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        throw Object.assign(new Error(`Shopify rate limited`), { status: 429, retryAfter });
      }
      if (res.status >= 500) {
        throw Object.assign(new Error(`Shopify server error ${res.status}`), { status: res.status });
      }

      return res;
    },
    {
      attempts: 3,
      baseDelay: 1_000,
      maxDelay: 8_000,
      shouldRetry: (err, attempt) => {
        // Respect Retry-After header on 429
        if (err instanceof Error && (err as NodeJS.ErrnoException & { status?: number }).status === 429 && attempt === 1) return true;
        return isShopifyTransient(err) || isNetworkTransient(err);
      },
      label: `shopify:${new URL(url).pathname}`,
    }
  );
}
