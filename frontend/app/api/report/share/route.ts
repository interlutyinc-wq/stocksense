import { createClient } from "@/lib/supabase/server";
import { parseBody, shareReportSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(request, shareReportSchema);
  if (parsed.error) return parsed.error;
  const { result } = parsed.data;

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
