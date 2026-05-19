import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { AnalysisResult } from "@/app/api/agent/analyze/route";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result } = (await request.json()) as { result: AnalysisResult };
  if (!result) return NextResponse.json({ error: "No result provided" }, { status: 400 });

  const { data, error } = await supabase
    .from("shared_reports")
    .insert({
      user_id: user.id,
      shop_domain: result.shop_domain,
      summary: result.summary,
      data: result as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return NextResponse.json({ url: `${appUrl}/report/${data.id}` });
}
