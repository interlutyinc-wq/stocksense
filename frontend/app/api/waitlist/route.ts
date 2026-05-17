import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const emailRaw =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return json({ error: "Valid email required" }, 400);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email: emailRaw });

  if (error) {
    if (error.code === "23505") {
      return json({ ok: true, duplicate: true });
    }
    console.error("waitlist insert", error);
    return json({ error: "Could not save. Try again later." }, 500);
  }

  return json({ ok: true });
}
