import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/onboarding");
  }

  const [{ data: shopifyData }, { data: suppliersData }, { data: profileData }, { data: purchaseOrdersData }] =
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
      supabase
        .from("profiles")
        .select("business_model, plan")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("purchase_orders")
        .select("id, supplier_name, supplier_email, sku, product_name, quantity, total_cost, urgency, status, created_at, sent_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      shopDomain={shopifyData?.shop_domain ?? null}
      suppliers={suppliersData ?? []}
      businessModel={(profileData?.business_model as "inventory" | "dropshipping" | "hybrid") ?? "inventory"}
      plan={(profileData?.plan as "free" | "starter" | "pro" | "agency" | "enterprise") ?? "free"}
      purchaseOrders={purchaseOrdersData ?? []}
    />
  );
}
