import { createClient } from "@/lib/supabase/server";
import { signOAuthState } from "@/lib/shopify-oauth-state";
import {
  DEFAULT_SHOPIFY_SCOPES,
  normalizeShopDomain,
} from "@/lib/shopify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const u = new URL("/onboarding", request.url);
    u.searchParams.set("step", "1");
    return NextResponse.redirect(u);
  }

  const shopRaw = request.nextUrl.searchParams.get("shop");
  if (!shopRaw) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const shop = normalizeShopDomain(shopRaw);
  if (!shop) {
    return NextResponse.json(
      { error: "Invalid shop domain (use your-store or your-store.myshopify.com)" },
      { status: 400 },
    );
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !appUrl) {
    return NextResponse.json(
      { error: "Shopify OAuth is not configured on the server" },
      { status: 500 },
    );
  }

  const scopes =
    process.env.SHOPIFY_SCOPES?.trim() || DEFAULT_SHOPIFY_SCOPES;
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/shopify/callback`;
  const state = signOAuthState(user.id);

  const authorize = new URL(`https://${shop}/admin/oauth/authorize`);
  authorize.searchParams.set("client_id", apiKey);
  authorize.searchParams.set("scope", scopes);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);

  return NextResponse.redirect(authorize.toString());
}
