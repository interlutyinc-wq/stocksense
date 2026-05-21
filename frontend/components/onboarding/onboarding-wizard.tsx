"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SupplierRow = {
  id: string;
  name: string;
  email: string;
  skus: string[];
  created_at: string;
};

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Shopify" },
  { id: 3, label: "Suppliers" },
] as const;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

function parseSkus(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function OnboardingWizard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [googleBusy, setGoogleBusy] = useState(false);

  const [shopInput, setShopInput] = useState("");
  const [shopifyBusy, setShopifyBusy] = useState(false);
  const [connectedShop, setConnectedShop] = useState<string | null>(null);
  const [shopifyReady, setShopifyReady] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierSkus, setSupplierSkus] = useState("");
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  // Auto-import from Shopify vendor field
  type VendorDraft = { name: string; skus: string[]; email: string };
  const [vendorDrafts, setVendorDrafts] = useState<VendorDraft[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);

  const urlStep = useMemo(() => {
    const s = Number.parseInt(searchParams.get("step") || "1", 10);
    if (s === 2 || s === 3) return s;
    return 1;
  }, [searchParams]);

  const notice = searchParams.get("notice");
  const noticeReason = searchParams.get("reason");
  const authMsg = searchParams.get("message");

  const banner = useMemo((): {
    type: "success" | "error";
    text: string;
  } | null => {
    switch (notice) {
      case "shopify_connected":
        return { type: "success", text: "Shopify store connected." };
      case "shopify_error":
        return {
          type: "error",
          text:
            noticeReason === "session"
              ? "Session expired. Sign in again and retry Shopify."
              : noticeReason === "store_limit"
              ? "Store limit reached for your plan. Upgrade to Agency to connect up to 5 stores."
              : "Could not complete Shopify connection. Check app credentials and try again.",
        };
      case "check_email":
        return {
          type: "success",
          text: "Check your email to confirm your account, then return here to sign in.",
        };
      case "supplier_saved":
        return { type: "success", text: "Supplier saved." };
      case "auth_error":
        return {
          type: "error",
          text: authMsg || "Authentication failed.",
        };
      default:
        return null;
    }
  }, [notice, noticeReason, authMsg]);

  const activeStep = useMemo(() => {
    if (!user) return 1;
    const raw = urlStep <= 1 ? 2 : urlStep;
    if (raw === 3) {
      if (!shopifyReady) return 3;
      if (!connectedShop) return 2;
      return 3;
    }
    return raw as 1 | 2 | 3;
  }, [user, urlStep, connectedShop, shopifyReady]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user || urlStep > 1) return;
    router.replace("/onboarding?step=2");
  }, [user, urlStep, router]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setShopifyReady(false);
      if (!user) {
        setConnectedShop(null);
        setShopifyReady(true);
        return;
      }
      const { data, error } = await supabase
        .from("shopify_connections")
        .select("shop_domain")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("shopify_connections", error);
        setConnectedShop(null);
      } else {
        setConnectedShop(data?.shop_domain ?? null);
      }
      setShopifyReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, supabase, searchKey]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!user) {
        if (!cancelled) setSuppliers([]);
        return;
      }
      if (!cancelled) setSuppliersLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,name,email,skus,created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setSuppliersLoading(false);
      if (error) {
        console.error("suppliers", error);
        return;
      }
      setSuppliers((data as SupplierRow[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [user, supabase, searchKey]);

  async function handleGoogleAuth() {
    setGoogleBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setAuthError(error.message);
      setGoogleBusy(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    const origin = window.location.origin;

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        // data.user is null when Supabase "Prevent email enumeration" is ON
        // and the address is already registered — the API returns success but
        // creates nothing. Surface a clear message instead of silently failing.
        if (!data.user) {
          setAuthError(
            "Registration failed. If you already have an account, use Log in.",
          );
          return;
        }

        // data.session is non-null only when email confirmation is disabled in
        // the Supabase project (auto-confirm). In that case the user is already
        // signed in and we skip the "check email" step.
        if (data.session) {
          router.replace("/onboarding?step=2");
        } else {
          router.replace("/onboarding?step=1&notice=check_email");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        router.replace("/onboarding?step=2");
      }
    } catch (err) {
      // Network failures or unexpected SDK throws — ensure the button
      // is always re-enabled and the user gets a readable message.
      setAuthError(
        err instanceof Error ? err.message : "Connection error. Please try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  function goToStep(next: number) {
    router.replace(`/onboarding?step=${next}`);
  }

  function startShopifyOAuth() {
    if (!shopInput.trim()) return;
    setShopifyBusy(true);
    const q = new URLSearchParams({ shop: shopInput.trim() });
    window.location.href = `/api/shopify/auth?${q.toString()}`;
  }

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSupplierError(null);
    const skus = parseSkus(supplierSkus);
    if (!supplierName.trim() || !supplierEmail.trim()) {
      setSupplierError("Name and email are required.");
      return;
    }
    if (skus.length === 0) {
      setSupplierError("Add at least one SKU.");
      return;
    }
    setSupplierBusy(true);
    const { error } = await supabase.from("suppliers").insert({
      user_id: user.id,
      name: supplierName.trim(),
      email: supplierEmail.trim().toLowerCase(),
      skus,
      updated_at: new Date().toISOString(),
    });
    setSupplierBusy(false);
    if (error) {
      setSupplierError(error.message);
      return;
    }
    setSupplierName("");
    setSupplierEmail("");
    setSupplierSkus("");
    router.replace("/onboarding?step=3&notice=supplier_saved");
  }

  async function handleAutoImport() {
    setImportBusy(true);
    setImportError(null);
    setVendorDrafts([]);
    try {
      const res = await fetch("/api/shopify/vendors");
      const data = (await res.json()) as { vendors?: VendorDraft[]; error?: string };
      if (!res.ok || data.error) {
        setImportError(data.error ?? "Failed to fetch vendors.");
        return;
      }
      const drafts = (data.vendors ?? [])
        .filter((v): v is VendorDraft => typeof v.name === "string")
        .map((v) => ({ ...v, email: "" }));
      if (drafts.length === 0) {
        setImportError("No new vendors found in your Shopify products.");
        return;
      }
      setVendorDrafts(drafts);
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleBulkSave() {
    if (!user) return;
    const toSave = vendorDrafts.filter((v) => v.email.trim());
    if (toSave.length === 0) {
      setImportError("Add at least one email before saving.");
      return;
    }
    setSavingBulk(true);
    setImportError(null);
    const rows = toSave.map((v) => ({
      user_id: user.id,
      name: v.name,
      email: v.email.trim().toLowerCase(),
      skus: v.skus,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("suppliers").insert(rows);
    setSavingBulk(false);
    if (error) {
      setImportError(error.message);
      return;
    }
    setVendorDrafts([]);
    router.replace("/onboarding?step=3&notice=supplier_saved");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/onboarding?step=1");
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-sm text-ss-cream/50">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5 md:px-12">
        <Link
          href="/"
          className="font-sans text-lg font-extrabold tracking-tight text-ss-cream"
        >
          Stock<em className="not-italic text-ss-accent">Sense</em>
        </Link>
        <div className="flex items-center gap-6">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ss-muted sm:inline">
            Onboarding
          </span>
          <Link
            href="/marketing"
            className="hidden font-mono text-xs text-ss-muted underline-offset-4 hover:text-ss-cream hover:underline sm:inline"
          >
            Marketing
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="font-mono text-xs text-ss-muted underline-offset-4 hover:text-ss-cream hover:underline"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8 md:py-16">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ss-green">
          MVP setup
        </p>
        <h1 className="font-sans text-3xl font-extrabold tracking-tight text-ss-cream md:text-4xl">
          Connect your stack
        </h1>
        <p className="mt-4 font-mono text-sm leading-relaxed text-ss-cream/55">
          Create your account, authorize Shopify, then tell the agent which
          SKUs each supplier covers—so recommendations and PO drafts stay
          accurate.
        </p>

        {banner ? (
          <div
            role="status"
            className={`mt-8 border px-4 py-3 font-mono text-xs ${
              banner.type === "success"
                ? "border-ss-green/40 bg-ss-green/10 text-ss-green"
                : "border-ss-accent/40 bg-ss-accent/10 text-ss-cream"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <nav
          className="mt-10 flex gap-2 border-b border-white/[0.06] pb-4"
          aria-label="Onboarding steps"
        >
          {STEPS.map((s) => {
            const active = activeStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={
                  (s.id === 2 && !user) ||
                  (s.id === 3 && (!user || !connectedShop))
                }
                onClick={() => goToStep(s.id)}
                className={`flex flex-1 flex-col items-start gap-1 border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  active
                    ? "border-ss-accent/50 bg-ss-accent/10"
                    : "border-white/[0.06] bg-ss-surface hover:border-ss-accent/25"
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-ss-muted">
                  0{s.id}
                </span>
                <span className="font-sans text-xs font-bold text-ss-cream">
                  {s.label}
                </span>
                {s.id === 2 && connectedShop ? (
                  <span className="font-mono text-[10px] text-ss-green">
                    Linked
                  </span>
                ) : null}
                {s.id === 3 && suppliers.length > 0 ? (
                  <span className="font-mono text-[10px] text-ss-green">
                    {suppliers.length} saved
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-10 border border-white/[0.06] bg-ss-surface p-6 md:p-8">
          {activeStep === 1 && (
            <section aria-labelledby="step-account">
              <h2
                id="step-account"
                className="font-sans text-lg font-bold text-ss-cream"
              >
                Account
              </h2>
              <p className="mt-2 font-mono text-xs leading-relaxed text-ss-cream/50">
                Use the same email you’ll use for purchase orders and alerts.
              </p>

              {/* ── Google OAuth ── */}
              <button
                type="button"
                onClick={() => void handleGoogleAuth()}
                disabled={googleBusy}
                className="mt-6 flex w-full items-center justify-center gap-3 border border-white/[0.1] bg-white px-4 py-3 font-sans text-sm font-bold text-gray-800 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <GoogleIcon />
                {googleBusy ? "Redirecting…" : "Continue with Google"}
              </button>

              {authError?.includes("disallowed_useragent") && (
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-ss-muted">
                  Google login is blocked in in-app browsers.{" "}
                  <span className="text-ss-cream">
                    Open this page directly in Safari or Chrome.
                  </span>
                </p>
              )}

              <p className="mt-2 font-mono text-[10px] text-ss-muted/60">
                If Google login fails, open this page directly in Safari or Chrome — not from a link inside another app.
              </p>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-ss-muted">or</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                    setResetSent(false);
                    setResetError(null);
                  }}
                  className={`flex-1 border py-2 font-sans text-xs font-bold ${
                    authMode === "signup"
                      ? "border-ss-accent bg-ss-accent text-white"
                      : "border-white/[0.08] text-ss-muted"
                  }`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                    setResetSent(false);
                    setResetError(null);
                  }}
                  className={`flex-1 border py-2 font-sans text-xs font-bold ${
                    authMode === "login"
                      ? "border-ss-accent bg-ss-accent text-white"
                      : "border-white/[0.08] text-ss-muted"
                  }`}
                >
                  Log in
                </button>
              </div>

              <form onSubmit={handleAuth} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                    >
                      Password
                    </label>
                    {authMode === "login" && (
                      <button
                        type="button"
                        disabled={resetBusy}
                        onClick={async () => {
                          setResetError(null);
                          const trimmed = email.trim();
                          if (!trimmed) {
                            setResetError("Please enter your email first.");
                            return;
                          }
                          setResetBusy(true);
                          const { error } =
                            await supabase.auth.resetPasswordForEmail(trimmed, {
                              redirectTo: `${window.location.origin}/auth/reset-password`,
                            });
                          setResetBusy(false);
                          if (error) {
                            setResetError(error.message);
                          } else {
                            setResetSent(true);
                          }
                        }}
                        className="font-mono text-[10px] text-ss-muted underline-offset-2 transition hover:text-ss-cream hover:underline disabled:opacity-50"
                      >
                        {resetBusy ? "Sending…" : "Forgot password?"}
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      authMode === "signup" ? "new-password" : "current-password"
                    }
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
                  />
                </div>
                {resetSent && (
                  <div
                    role="status"
                    className="border border-ss-green/40 bg-ss-green/10 px-4 py-3 font-mono text-xs text-ss-green"
                  >
                    Check your email for the reset link.
                  </div>
                )}
                {resetError && (
                  <p className="font-mono text-xs text-ss-accent">{resetError}</p>
                )}
                {authError ? (
                  <p className="font-mono text-xs text-ss-accent">{authError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full bg-ss-accent py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#00e5a0] disabled:opacity-50"
                >
                  {authBusy
                    ? "Please wait…"
                    : authMode === "signup"
                      ? "Create account"
                      : "Log in"}
                </button>
              </form>
            </section>
          )}

          {activeStep === 2 && user && (
            <section aria-labelledby="step-shopify">
              <h2
                id="step-shopify"
                className="font-sans text-lg font-bold text-ss-cream"
              >
                Shopify
              </h2>
              <p className="mt-2 font-mono text-xs leading-relaxed text-ss-cream/50">
                OAuth keeps the agent in sync with inventory and sales velocity.
                Use your store subdomain (e.g.{" "}
                <span className="text-ss-cream/80">my-brand</span>) or full{" "}
                <span className="text-ss-cream/80">.myshopify.com</span>{" "}
                hostname.
              </p>

              {connectedShop ? (
                <div className="mt-6 border border-ss-green/30 bg-ss-green/5 px-4 py-3">
                  <p className="font-mono text-xs text-ss-green">
                    Connected:{" "}
                    <strong className="text-ss-cream">{connectedShop}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="mt-4 bg-ss-accent px-6 py-2 font-sans text-xs font-bold text-white transition hover:-translate-y-0.5"
                  >
                    Continue to suppliers →
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="shop"
                      className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                    >
                      Store domain
                    </label>
                    <input
                      id="shop"
                      name="shop"
                      placeholder="your-store or your-store.myshopify.com"
                      value={shopInput}
                      onChange={(e) => setShopInput(e.target.value)}
                      className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 placeholder:text-ss-muted/50 focus:ring-2"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={shopifyBusy || !shopInput.trim()}
                    onClick={startShopifyOAuth}
                    className="w-full bg-ss-accent py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#00e5a0] disabled:opacity-50"
                  >
                    {shopifyBusy ? "Redirecting…" : "Connect with Shopify"}
                  </button>
                </div>
              )}
            </section>
          )}

          {activeStep === 3 && user && (
            <section aria-labelledby="step-suppliers">
              <h2
                id="step-suppliers"
                className="font-sans text-lg font-bold text-ss-cream"
              >
                Suppliers
              </h2>
              <p className="mt-2 font-mono text-xs leading-relaxed text-ss-cream/50">
                Map each supplier to the SKUs they fulfill. Separate SKUs with
                commas or new lines.
              </p>

              {!shopifyReady ? (
                <p className="mt-6 font-mono text-xs text-ss-muted">
                  Loading store connection…
                </p>
              ) : !connectedShop ? (
                <p className="mt-6 font-mono text-xs text-ss-accent">
                  Connect Shopify first so the agent can match these SKUs to
                  catalog data.
                </p>
              ) : (
                <>
                  {/* ── Auto-import from Shopify vendors ── */}
                  <div className="mt-6 border border-white/[0.06] bg-ss-black/40 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-sans text-sm font-bold text-ss-cream">
                          Auto-import from Shopify
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ss-muted">
                          Detects vendors from your product catalog and pre-fills name + SKUs.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAutoImport()}
                        disabled={importBusy}
                        className="shrink-0 border border-ss-green/40 bg-ss-green/10 px-4 py-2 font-sans text-xs font-bold text-ss-green transition hover:bg-ss-green/20 disabled:opacity-50"
                      >
                        {importBusy ? "Detecting…" : "↓ Import vendors"}
                      </button>
                    </div>

                    {importError && (
                      <p className="mt-3 font-mono text-xs text-ss-accent">{importError}</p>
                    )}

                    {vendorDrafts.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-ss-muted">
                          {vendorDrafts.length} vendor{vendorDrafts.length > 1 ? "s" : ""} detected — add email to save
                        </p>
                        {vendorDrafts.map((v, i) => (
                          <div key={i} className="border border-white/[0.06] bg-ss-black p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-sans text-sm font-bold text-ss-cream">{v.name}</p>
                                <p className="mt-1 font-mono text-[10px] text-ss-muted">
                                  {v.skus.length} SKU{v.skus.length !== 1 ? "s" : ""}
                                  {v.skus.length > 0 && `: ${v.skus.slice(0, 3).join(", ")}${v.skus.length > 3 ? "…" : ""}`}
                                </p>
                              </div>
                              <input
                                type="email"
                                placeholder="contact@supplier.com"
                                value={v.email}
                                onChange={(e) => {
                                  const updated = [...vendorDrafts];
                                  const current = updated[i];
                                  if (current) updated[i] = { ...current, email: e.target.value };
                                  setVendorDrafts(updated);
                                }}
                                className="w-48 shrink-0 border border-white/[0.1] bg-ss-surface px-2 py-1.5 font-mono text-xs text-ss-cream outline-none ring-ss-accent/30 placeholder:text-ss-muted/50 focus:ring-2"
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => void handleBulkSave()}
                          disabled={savingBulk}
                          className="w-full border border-ss-green/40 bg-ss-green/15 py-2.5 font-sans text-sm font-bold text-ss-green transition hover:bg-ss-green/25 disabled:opacity-50"
                        >
                          {savingBulk ? "Saving…" : `Save ${vendorDrafts.filter(v => v.email.trim()).length || "all"} suppliers →`}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ss-muted">or add manually</span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <form
                    onSubmit={handleSupplierSubmit}
                    className="mt-6 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="sname"
                        className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                      >
                        Supplier name
                      </label>
                      <input
                        id="sname"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="semail"
                        className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                      >
                        Contact email (for PO)
                      </label>
                      <input
                        id="semail"
                        type="email"
                        value={supplierEmail}
                        onChange={(e) => setSupplierEmail(e.target.value)}
                        className="mt-1.5 w-full border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 focus:ring-2"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="sskus"
                        className="font-mono text-[10px] uppercase tracking-wider text-ss-muted"
                      >
                        SKUs
                      </label>
                      <textarea
                        id="sskus"
                        rows={4}
                        value={supplierSkus}
                        onChange={(e) => setSupplierSkus(e.target.value)}
                        placeholder={"SKU-001\nSKU-002, SKU-003"}
                        className="mt-1.5 w-full resize-y border border-white/[0.1] bg-ss-black px-3 py-2.5 font-mono text-sm text-ss-cream outline-none ring-ss-accent/30 placeholder:text-ss-muted/50 focus:ring-2"
                      />
                    </div>
                    {supplierError ? (
                      <p className="font-mono text-xs text-ss-accent">
                        {supplierError}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={supplierBusy}
                      className="w-full border border-ss-green/40 bg-ss-green/15 py-3 font-sans text-sm font-bold text-ss-green transition hover:bg-ss-green/25 disabled:opacity-50"
                    >
                      {supplierBusy ? "Saving…" : "Save supplier"}
                    </button>
                  </form>

                  <div className="mt-10">
                    <h3 className="font-sans text-sm font-bold text-ss-cream">
                      Your suppliers
                    </h3>
                    {suppliersLoading ? (
                      <p className="mt-3 font-mono text-xs text-ss-muted">
                        Loading…
                      </p>
                    ) : suppliers.length === 0 ? (
                      <p className="mt-3 font-mono text-xs text-ss-muted">
                        No suppliers yet.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {suppliers.map((s) => (
                          <li
                            key={s.id}
                            className="border border-white/[0.06] bg-ss-black/60 px-4 py-3"
                          >
                            <p className="font-sans text-sm font-bold text-ss-cream">
                              {s.name}
                            </p>
                            <p className="mt-1 font-mono text-xs text-ss-muted">
                              {s.email}
                            </p>
                            <p className="mt-2 font-mono text-[11px] leading-relaxed text-ss-cream/70">
                              {s.skus.join(" · ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        <p className="mt-10 text-center font-mono text-[10px] text-ss-muted">
          StockSense · Reasons · Decides · Explains · Acts
        </p>
      </div>
    </div>
  );
}
