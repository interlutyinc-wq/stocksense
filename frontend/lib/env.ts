/**
 * Environment variable validation.
 * Validates all required env vars at module load time.
 * Fails fast with a clear error message if anything is missing —
 * prevents silent runtime failures in production.
 */

import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL:      z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NODE_ENV:            z.enum(["development", "production", "test"]).default("production"),

  // Stripe — optional in CI/build, required at runtime
  STRIPE_SECRET_KEY:       z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET:   z.string().optional(),
  STRIPE_STARTER_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID:     z.string().optional(),
  STRIPE_AGENCY_PRICE_ID:  z.string().optional(),

  // Anthropic — optional in build
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant").optional(),

  // Shopify
  SHOPIFY_API_KEY:            z.string().optional(),
  SHOPIFY_API_SECRET:         z.string().optional(),
  SHOPIFY_OAUTH_STATE_SECRET: z.string().min(32, "SHOPIFY_OAUTH_STATE_SECRET must be at least 32 chars").optional(),

  // Resend
  RESEND_API_KEY: z.string().startsWith("re_").optional(),

  // Monitoring
  NEXT_PUBLIC_SENTRY_DSN:   z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY:  z.string().optional(),
  CRON_SECRET:              z.string().min(16).optional(),
});

// ── Validation ────────────────────────────────────────────────────────────────

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  ✗ ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    const message = `\n\n❌ Invalid environment variables:\n${issues}\n\n` +
      `Fix the above variables in your .env.local or Vercel dashboard.\n`;

    // In production: throw (crash fast)
    // In development: warn (allow partial operation)
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(message);
    }

    // Return partial env for development tolerance
    return process.env as unknown as Env;
  }

  return result.data;
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// Validated once at module load, reused everywhere.

export const env = validateEnv();

// ── Typed accessors ───────────────────────────────────────────────────────────
// Use these instead of process.env directly for type safety.

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
