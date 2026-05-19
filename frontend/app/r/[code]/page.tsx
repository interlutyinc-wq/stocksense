import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReferralPage({ params }: { params: { code: string } }) {
  const supabase = await createClient();

  // Find the referrer
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", params.code)
    .maybeSingle();

  if (!referrer) {
    redirect("/onboarding");
  }

  // Redirect to onboarding with referral code tracked in URL
  redirect(`/onboarding?ref=${params.code}`);
}
