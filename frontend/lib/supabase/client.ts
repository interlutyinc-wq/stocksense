import { createBrowserClient } from "@supabase/ssr";

/**
 * Uses build-safe fallbacks so `next build` can run without a local `.env`.
 * Configure real values in `.env.local` or Vercel before running the app.
 */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";
  return createBrowserClient(url, key);
}
