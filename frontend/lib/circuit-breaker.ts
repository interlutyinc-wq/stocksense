/**
 * Circuit Breaker pattern for external API calls.
 *
 * Prevents cascade failures when Shopify or Anthropic are degraded.
 * Three states:
 *   CLOSED   — normal operation, requests flow through
 *   OPEN     — too many failures, requests rejected immediately
 *   HALF_OPEN — testing recovery with limited traffic
 *
 * Based on the Netflix Hystrix paper and Martin Fowler's circuit breaker pattern.
 */

import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  /** Failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Success count in HALF_OPEN before closing. Default: 2 */
  successThreshold?: number;
  /** Milliseconds to wait before attempting HALF_OPEN. Default: 30_000 */
  resetTimeout?: number;
  /** Window in ms for counting failures. Default: 60_000 */
  window?: number;
  /** Name for logging. */
  name: string;
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string, resetIn: number) {
    super(`Circuit breaker OPEN for "${name}". Retry in ${Math.ceil(resetIn / 1000)}s.`);
    this.name = "CircuitBreakerOpenError";
  }
}

// ── Circuit Breaker ───────────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private lastFailureAt = 0;
  private openedAt = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeout: number;
  private readonly name: string;

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.successThreshold = config.successThreshold ?? 2;
    this.resetTimeout = config.resetTimeout ?? 30_000;
    this.name = config.name;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  /** Execute a function through the circuit breaker. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransition();

    if (this.state === "OPEN") {
      const resetIn = this.openedAt + this.resetTimeout - Date.now();
      throw new CircuitBreakerOpenError(this.name, Math.max(0, resetIn));
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) throw err;
      this.onFailure();
      throw err;
    }
  }

  private maybeTransition(): void {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.resetTimeout) {
        this.state = "HALF_OPEN";
        this.successes = 0;
        logger.info(`Circuit breaker HALF_OPEN`, { name: this.name });
      }
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.close();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureAt = Date.now();

    if (this.state === "HALF_OPEN" || this.failures >= this.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = "OPEN";
    this.openedAt = Date.now();
    logger.warn(`Circuit breaker OPEN`, {
      name: this.name,
      failures: this.failures,
      reset_in_ms: this.resetTimeout,
    });
  }

  private close(): void {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    logger.info(`Circuit breaker CLOSED`, { name: this.name });
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      opened_at: this.state !== "CLOSED" ? new Date(this.openedAt).toISOString() : null,
      reset_in_ms: this.state === "OPEN"
        ? Math.max(0, this.openedAt + this.resetTimeout - Date.now())
        : null,
    };
  }
}

// ── Singleton breakers ────────────────────────────────────────────────────────

/** Shopify Admin API circuit breaker. */
export const shopifyBreaker = new CircuitBreaker({
  name: "shopify",
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30_000, // 30 seconds
});

/** Anthropic API circuit breaker. */
export const anthropicBreaker = new CircuitBreaker({
  name: "anthropic",
  failureThreshold: 3,
  successThreshold: 1,
  resetTimeout: 60_000, // 1 minute
});
