/**
 * In-process LRU cache for external API responses.
 *
 * Reduces redundant Shopify API calls when multiple requests
 * arrive within the same TTL window. Designed for serverless —
 * cache lives per-instance, resets on cold start.
 *
 * For distributed caching across instances, replace the store
 * with Upstash Redis (drop-in via the same interface).
 */

import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

interface CacheOptions {
  /** TTL in seconds. Default: 60 */
  ttl?: number;
  /** Max entries before LRU eviction. Default: 500 */
  maxSize?: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}

// ── LRU Cache implementation ──────────────────────────────────────────────────

class LRUCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = { size: 0, hits: 0, misses: 0, evictions: 0 };
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 500;
    this.defaultTtl = options.ttl ?? 60;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // LRU: move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, { ...entry, hits: entry.hits + 1 });
    this.stats.hits++;

    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ?? this.defaultTtl;

    // LRU eviction if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
      hits: 0,
    });

    this.stats.size = this.store.size;
  }

  delete(key: string): void {
    this.store.delete(key);
    this.stats.size = this.store.size;
  }

  /** Invalidate all keys matching a prefix. */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.size = this.store.size;
    return count;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  /** Wrap an async function with cache. */
  async wrap<R>(
    key: string,
    fn: () => Promise<R>,
    ttlSeconds?: number
  ): Promise<R> {
    const cached = this.get(key) as R | undefined;
    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    this.set(key, value as unknown as T, ttlSeconds);
    return value;
  }
}

// ── Singleton caches ──────────────────────────────────────────────────────────

/** Shopify inventory cache — 90s TTL, 1000 entries max. */
export const inventoryCache = new LRUCache<unknown>({
  ttl: 90,
  maxSize: 1_000,
});

/** Shopify vendor cache — 5min TTL. */
export const vendorCache = new LRUCache<unknown>({
  ttl: 300,
  maxSize: 500,
});

// ── Cache key builders ────────────────────────────────────────────────────────

export function inventoryCacheKey(shopDomain: string, userId: string): string {
  return `inventory:${shopDomain}:${userId}`;
}

export function vendorCacheKey(shopDomain: string, userId: string): string {
  return `vendors:${shopDomain}:${userId}`;
}

// ── Cache-aware Shopify inventory fetch ───────────────────────────────────────

interface ShopifyProductCached {
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

export async function getCachedInventory(
  shopDomain: string,
  accessToken: string,
  userId: string
): Promise<ShopifyProductCached[]> {
  const cacheKey = inventoryCacheKey(shopDomain, userId);

  return inventoryCache.wrap(
    cacheKey,
    async () => {
      logger.debug("Cache miss — fetching inventory from Shopify", { shop_domain: shopDomain });

      const res = await fetch(
        `https://${shopDomain}/admin/api/2024-01/products.json?limit=250&status=active`,
        {
          headers: { "X-Shopify-Access-Token": accessToken },
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (!res.ok) {
        throw new Error(`Shopify inventory fetch failed: ${res.status}`);
      }

      const data = await res.json() as { products: ShopifyProductCached[] };
      logger.debug("Inventory cached", { shop_domain: shopDomain, count: data.products?.length ?? 0 });
      return data.products ?? [];
    },
    90 // 90 second TTL
  ) as Promise<ShopifyProductCached[]>;
}

// ── Cache stats endpoint helper ───────────────────────────────────────────────

export function getCacheStats() {
  return {
    inventory: inventoryCache.getStats(),
    vendors: vendorCache.getStats(),
  };
}
