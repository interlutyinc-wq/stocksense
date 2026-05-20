import { createClient } from "@/lib/supabase/server";
import { verifyOAuthState } from "@/lib/shopify-oauth-state";
import { getLimits } from "@/lib/plans";
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyShopifyHmac(
  query: Record<string, string>,
  secret: string,
): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;
  const message = Object.keys(query)
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join("&");
  const digest = createHmac("sha256", secret).update(message).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(digest, "utf8"),
      Buffer.from(hmac, "utf8"),
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const params = Object.fromEntries(url.searchParams.entries());

  const secret = process.env.SHOPIFY_API_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const fail = (reason: string) =>
    NextResponse.redirect(
      `${appUrl}/onboarding?step=2&notice=shopify_error&reason=${encodeURIComponent(reason)}`,
    );

  if (!secret || !appUrl) {
    return fail("server_config");
  }

  if (!verifyShopifyHmac(params, secret)) {
    return fail("hmac");
  }

  const statePayload = verifyOAuthState(params.state ?? "");
  if (!statePayload) {
    return fail("state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== statePayload.userId) {
    return fail("session");
  }

  // Check store limit based on plan
  const { data: profile } = await supabase
    .from("profiles").select("plan").eq("id", user.id).maybeSingle();
  const limits = getLimits(profile?.plan ?? "free");

  if (limits.maxStores !== -1) {
    const { count } = await supabase
      .from("shopify_connections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= limits.maxStores) {
      return NextResponse.redirect(
        `${appUrl}/onboarding?step=2&notice=shopify_error&reason=store_limit`
      );
    }
  }

  const code = params.code;
  const shop = params.shop;
  if (!code || !shop) {
    return fail("missing_code");
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: secret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return fail("token_exchange");
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    scope?: string;
  };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return fail("no_token");
  }

  const { error } = await supabase.from("shopify_connections").upsert(
    {
      user_id: user.id,
      shop_domain: shop,
      access_token: accessToken,
      scopes: tokenJson.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,shop_domain" },
  );

  if (error) {
    console.error("shopify_connections upsert", error);
    return fail("db");
  }

  return NextResponse.redirect(
    `${appUrl}/onboarding?step=3&notice=shopify_connected`,
  );
}
