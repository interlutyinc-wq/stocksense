import { createClient } from "@/lib/supabase/server";
import { parseBody, waitlistSchema } from "@/lib/validation";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.waitlist);
  if (!rl.success) return rateLimitResponse(rl);

  const parsed = await parseBody(request, waitlistSchema);
  if (parsed.error) return json({ error: "Valid email required" }, 400);
  const { email } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email });

  if (error) {
    if (error.code === "23505") {
      return json({ ok: true, duplicate: true });
    }
    console.error("waitlist insert", error);
    return json({ error: "Could not save. Try again later." }, 500);
  }

  return json({ ok: true });
}
