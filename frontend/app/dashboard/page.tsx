import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getLimits } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/onboarding");
  }

  // Fetch profile first to get plan limits
  const { data: profileData } = await supabase
    .from("profiles")
    .select("business_model, plan, referral_code")
    .eq("id", user.id)
    .maybeSingle();

  const plan = (profileData?.plan ?? "free") as string;
  const limits = getLimits(plan);

  // Build PO history query with date filter based on plan
  let poQuery = supabase
    .from("purchase_orders")
    .select("id, supplier_name, supplier_email, sku, product_name, quantity, total_cost, urgency, status, created_at, sent_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (limits.poHistoryDays !== -1 && limits.poHistoryDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limits.poHistoryDays);
    poQuery = poQuery.gte("created_at", cutoff.toISOString());
  }

  // Free plan: no history
  if (limits.poHistoryDays === 0) {
    poQuery = poQuery.limit(0);
  }

  const [{ data: shopifyData }, { data: suppliersData }, { data: purchaseOrdersData }] =
    await Promise.all([
      supabase
        .from("shopify_connections")
        .select("shop_domain")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("suppliers")
        .select("id, name, email, skus, created_at")
        .order("created_at", { ascending: false }),
      poQuery,
    ]);

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      shopDomain={shopifyData?.shop_domain ?? null}
      suppliers={suppliersData ?? []}
      businessModel={(profileData?.business_model as "inventory" | "dropshipping" | "hybrid") ?? "inventory"}
      plan={(plan as "free" | "starter" | "pro" | "agency" | "enterprise")}
      referralCode={profileData?.referral_code ?? null}
      purchaseOrders={purchaseOrdersData ?? []}
    />
  );
}
