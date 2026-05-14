import { updateSupabaseSession } from "@/lib/supabase/update-session";
import { type NextRequest } from "next/server";

/**
 * Next.js 16+ Proxy (Node.js runtime on Vercel — compatible with @supabase/ssr).
 * Do not use middleware.ts for Supabase here; Edge bundles fail on transitive deps.
 */
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
