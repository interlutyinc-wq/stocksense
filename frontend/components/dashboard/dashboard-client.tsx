"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AnalysisResult, Recommendation } from "@/app/api/agent/analyze/route";

type Supplier = {
  id: string;
  name: string;
  email: string;
  skus: string[];
  created_at: string;
};

type BusinessModel = "inventory" | "dropshipping" | "hybrid";

const MODEL_OPTIONS: { value: BusinessModel; label: string; desc: string }[] = [
  { value: "inventory",    label: "Own inventory",  desc: "I stock products and reorder from suppliers" },
  { value: "dropshipping", label: "Dropshipping",   desc: "My supplier fulfills orders directly" },
  { value: "hybrid",       label: "Hybrid",         desc: "Mix of own stock and dropshipping" },
];

type Plan = "free" | "starter" | "agent" | "enterprise";

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  starter: "Starter · $49/mo",
  agent: "Agent · $149/mo",
  enterprise: "Enterprise",
};

type Props = {
  userEmail: string;
  shopDomain: string | null;
  suppliers: Supplier[];
  businessModel: BusinessModel;
  plan: Plan;
};

const STATUS_STYLES: Record<Recommendation["status"], string> = {
  critical: "border-ss-accent/40 bg-ss-accent/10 text-ss-accent",
  low: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  ok: "border-ss-green/30 bg-ss-green/10 text-ss-green",
};

const STATUS_LABELS: Record<Recommendation["status"], string> = {
  critical: "Critical",
  low: "Low stock",
  ok: "OK",
};

export function DashboardClient({ userEmail, shopDomain, suppliers, businessModel: initialModel, plan }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [model, setModel] = useState<BusinessModel>(initialModel);
  const [savingModel, setSavingModel] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/onboarding");
  }

  async function handleCheckout(planKey: "starter" | "agent") {
    setCheckoutBusy(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const { url, error } = (await res.json()) as { url?: string; error?: string };
      if (error || !url) throw new Error(error ?? "Checkout failed");
      window.location.href = url;
    } catch {
      setCheckoutBusy(null);
    }
  }

  async function handlePortal() {
    setPortalBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url } = (await res.json()) as { url?: string };
      if (url) window.location.href = url;
    } finally {
      setPortalBusy(false);
    }
  }

  async function saveModel(next: BusinessModel) {
    setSavingModel(true);
    setModel(next);
    await supabase.from("profiles").update({ business_model: next }).eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
    setSavingModel(false);
    setAnalysisResult(null); // clear old results when model changes
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/agent/analyze", { method: "POST" });
      const data = (await res.json()) as AnalysisResult & { error?: string };

      if (!res.ok || data.error) {
        setAnalysisError(data.error ?? "Analysis failed. Please try again.");
        return;
      }

      setAnalysisResult(data);
    } catch {
      setAnalysisError("Network error. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  const urgentRecs = analysisResult?.recommendations.filter(
    (r) => r.status === "critical" || r.status === "low",
  ) ?? [];

  const okRecs = analysisResult?.recommendations.filter(
    (r) => r.status === "ok",
  ) ?? [];

  return (
    <div className="min-h-screen bg-ss-black">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-ss-black/90 px-6 py-4 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-sans text-lg font-extrabold tracking-tight text-ss-cream"
          >
            Stock<em className="not-italic text-ss-accent">Sense</em>
          </Link>
          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
          {shopDomain ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-ss-green" aria-hidden />
              <span className="font-mono text-xs text-ss-cream/70">{shopDomain}</span>
            </div>
          ) : (
            <span className="hidden font-mono text-xs text-ss-accent/80 sm:block">
              No store connected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] text-ss-muted sm:block">
            {userEmail}
          </span>
          {plan !== "free" ? (
            <button
              type="button"
              onClick={() => void handlePortal()}
              disabled={portalBusy}
              className="hidden border border-ss-green/30 bg-ss-green/10 px-3 py-1.5 font-mono text-[10px] text-ss-green transition hover:bg-ss-green/20 sm:block disabled:opacity-50"
            >
              {portalBusy ? "…" : PLAN_LABELS[plan]}
            </button>
          ) : (
            <span className="hidden border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] text-ss-muted sm:block">
              Free plan
            </span>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="border border-white/[0.08] px-3 py-1.5 font-mono text-[11px] text-ss-muted transition hover:border-ss-accent/40 hover:text-ss-cream"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10 md:px-12 md:py-14">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden border border-white/[0.06] bg-ss-surface p-6 md:p-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "rgba(255,77,28,0.5)" }}
            aria-hidden
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ss-accent">
            Dashboard
          </p>
          <h1 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-ss-cream md:text-3xl">
            Your agent is ready.
          </h1>
          <p className="mt-2 font-mono text-sm leading-relaxed text-ss-cream/50">
            {shopDomain ? (
              <>
                Connected store: <strong className="text-ss-cream">{shopDomain}</strong>
              </>
            ) : (
              "Connect your Shopify store to get started."
            )}
          </p>
        </div>

        {/* ── Suppliers ── */}
        <section aria-labelledby="suppliers-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="suppliers-heading" className="font-sans text-base font-bold text-ss-cream">
              Your suppliers
            </h2>
            <Link
              href="/onboarding?step=3"
              className="font-mono text-[11px] text-ss-muted underline-offset-4 transition hover:text-ss-green hover:underline"
            >
              + Add supplier
            </Link>
          </div>

          {suppliers.length === 0 ? (
            <div className="border border-white/[0.06] bg-ss-surface px-6 py-8 text-center">
              <p className="font-mono text-sm text-ss-muted">
                No suppliers yet — add one from onboarding.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((s) => (
                <li
                  key={s.id}
                  className="border border-white/[0.06] bg-ss-surface p-4 transition hover:border-white/[0.12]"
                >
                  <p className="font-sans text-sm font-bold text-ss-cream">{s.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-ss-muted">{s.email}</p>
                  {s.skus.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.skus.slice(0, 6).map((sku) => (
                        <span
                          key={sku}
                          className="border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-ss-cream/60"
                        >
                          {sku}
                        </span>
                      ))}
                      {s.skus.length > 6 && (
                        <span className="px-2 py-0.5 font-mono text-[10px] text-ss-muted">
                          +{s.skus.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Business model selector ── */}
        <section aria-labelledby="model-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="model-heading" className="font-sans text-base font-bold text-ss-cream">
              Business model
            </h2>
            {savingModel && (
              <span className="font-mono text-[10px] text-ss-muted">Saving…</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => void saveModel(opt.value)}
                className={`border p-4 text-left transition ${
                  model === opt.value
                    ? "border-ss-accent/50 bg-ss-accent/10"
                    : "border-white/[0.06] bg-ss-surface hover:border-ss-accent/25"
                }`}
              >
                <p className="font-sans text-sm font-bold text-ss-cream">{opt.label}</p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-ss-muted">
                  {opt.desc}
                </p>
                {model === opt.value && (
                  <span className="mt-2 inline-block font-mono text-[10px] text-ss-accent">
                    ✓ Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── Analyze ── */}
        <section aria-labelledby="analyze-heading">
          <h2 id="analyze-heading" className="mb-4 font-sans text-base font-bold text-ss-cream">
            Inventory analysis
          </h2>

          <div className="border border-white/[0.06] bg-ss-surface p-6 md:p-8">
            <p className="font-mono text-sm leading-relaxed text-ss-cream/55">
              The agent fetches your live Shopify inventory, reasons through stock levels
              and supplier lead times, and generates reorder recommendations with full
              plain-language explanations.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={analyzing || !shopDomain}
                className="inline-flex items-center gap-2 bg-ss-accent px-8 py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#00e5a0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <SpinnerIcon />
                    Agent processing…
                  </>
                ) : analysisResult ? (
                  "Re-analyze inventory →"
                ) : (
                  "Analyze inventory →"
                )}
              </button>

              {!shopDomain && (
                <p className="font-mono text-[11px] text-ss-accent/80">
                  Connect Shopify before running an analysis.
                </p>
              )}
            </div>

            {analyzing && (
              <div className="mt-6 border border-ss-accent/20 bg-ss-accent/5 px-4 py-3">
                <p className="font-mono text-xs text-ss-accent/80">
                  ⟳ Fetching Shopify inventory · Reasoning through data · Generating recommendations…
                </p>
              </div>
            )}

            {analysisError && (
              <div
                role="alert"
                className="mt-6 border border-ss-accent/30 bg-ss-accent/5 px-4 py-3"
              >
                <p className="font-mono text-xs text-ss-accent">{analysisError}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Recommendations ── */}
        <section aria-labelledby="recs-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recs-heading" className="font-sans text-base font-bold text-ss-cream">
              Recommendations
            </h2>
            {analysisResult && (
              <span className="font-mono text-[11px] text-ss-muted">
                {analysisResult.total_skus_analyzed} SKUs analyzed ·{" "}
                {analysisResult.items_needing_attention} need attention
              </span>
            )}
          </div>

          <div className="border border-white/[0.06] bg-ss-surface">
            {!analysisResult ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center border border-white/[0.06] bg-ss-black/60">
                  <AgentIcon />
                </div>
                <p className="font-sans text-sm font-bold text-ss-cream">
                  No analysis run yet
                </p>
                <p className="mt-2 max-w-sm font-mono text-xs leading-relaxed text-ss-muted">
                  Click <strong className="text-ss-cream">Analyze inventory</strong> to get
                  started — the agent will reason through your live Shopify data and generate
                  order recommendations with full explanations.
                </p>
              </div>
            ) : (
              /* Real results */
              <div>
                {/* Summary banner */}
                <div className="border-b border-white/[0.06] px-6 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ss-accent">
                    → Analysis complete ·{" "}
                    {new Date(analysisResult.analyzed_at).toLocaleTimeString()}
                  </p>
                  <p className="mt-1 font-mono text-sm leading-relaxed text-ss-cream/80">
                    {analysisResult.summary}
                  </p>
                </div>

                {/* Urgent items */}
                {urgentRecs.length > 0 && (
                  <div>
                    <p className="border-b border-white/[0.04] px-6 py-2 font-mono text-[10px] uppercase tracking-wider text-ss-muted">
                      Action required
                    </p>
                    <ul className="divide-y divide-white/[0.04]">
                      {urgentRecs.map((rec, i) => (
                        <RecommendationRow key={i} rec={rec} />
                      ))}
                    </ul>
                  </div>
                )}

                {/* OK items */}
                {okRecs.length > 0 && (
                  <div>
                    <p className="border-b border-white/[0.04] border-t border-t-white/[0.06] px-6 py-2 font-mono text-[10px] uppercase tracking-wider text-ss-muted">
                      Healthy stock
                    </p>
                    <ul className="divide-y divide-white/[0.04]">
                      {okRecs.map((rec, i) => (
                        <RecommendationRow key={i} rec={rec} />
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.recommendations.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <p className="font-mono text-sm text-ss-muted">
                      No products found to analyze. Make sure your Shopify store has active products.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

        {/* ── Upgrade / Plan ── */}
        {plan === "free" && (
          <section aria-labelledby="upgrade-heading">
            <h2 id="upgrade-heading" className="mb-4 font-sans text-base font-bold text-ss-cream">
              Upgrade your plan
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Starter */}
              <div className="border border-white/[0.06] bg-ss-surface p-6">
                <p className="font-sans text-lg font-extrabold text-ss-cream">Starter</p>
                <p className="mt-1 font-sans text-3xl font-extrabold text-ss-accent">$49<span className="font-mono text-sm text-ss-muted">/mo</span></p>
                <ul className="mt-4 space-y-1.5">
                  {["Up to 50 SKUs", "Amazon + Shopify", "AI reasoning + explanations", "30-day forecast", "1 user"].map(f => (
                    <li key={f} className="flex items-center gap-2 font-mono text-[11px] text-ss-cream/70">
                      <span className="text-ss-green">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void handleCheckout("starter")}
                  disabled={checkoutBusy !== null}
                  className="mt-6 w-full border border-ss-accent/50 bg-ss-accent/10 py-3 font-sans text-sm font-bold text-ss-accent transition hover:bg-ss-accent/20 disabled:opacity-50"
                >
                  {checkoutBusy === "starter" ? "Redirecting…" : "Get Starter →"}
                </button>
              </div>

              {/* Agent */}
              <div className="relative border border-ss-accent/30 bg-ss-surface p-6">
                <span className="absolute -top-3 left-4 bg-ss-accent px-3 py-0.5 font-mono text-[10px] font-bold text-white">MOST POPULAR</span>
                <p className="font-sans text-lg font-extrabold text-ss-cream">Agent</p>
                <p className="mt-1 font-sans text-3xl font-extrabold text-ss-accent">$149<span className="font-mono text-sm text-ss-muted">/mo</span></p>
                <ul className="mt-4 space-y-1.5">
                  {["Unlimited SKUs", "All channels + multi-warehouse", "Autonomous PO generation", "90-day AI forecast", "5 users"].map(f => (
                    <li key={f} className="flex items-center gap-2 font-mono text-[11px] text-ss-cream/70">
                      <span className="text-ss-green">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void handleCheckout("agent")}
                  disabled={checkoutBusy !== null}
                  className="mt-6 w-full bg-ss-accent py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#00e5a0] disabled:opacity-50"
                >
                  {checkoutBusy === "agent" ? "Redirecting…" : "Get Agent →"}
                </button>
              </div>
            </div>
          </section>
        )}

      <footer className="mt-4 border-t border-white/[0.04] px-6 py-6 text-center md:px-12">
        <p className="font-mono text-[10px] text-ss-muted">
          StockSense · Reasons · Decides · Explains · Acts
        </p>
      </footer>
    </div>
  );
}

/* ── Recommendation row ─────────────────────────────────────────────────────── */

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] ${STATUS_STYLES[rec.status]}`}
            >
              {STATUS_LABELS[rec.status]}
            </span>
            <p className="font-sans text-sm font-bold text-ss-cream truncate">
              {rec.product}
            </p>
            {rec.sku && (
              <span className="font-mono text-[10px] text-ss-muted">{rec.sku}</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-ss-cream/60">
            <span>
              Stock:{" "}
              <strong className={rec.status === "critical" ? "text-ss-accent" : "text-ss-cream"}>
                {rec.current_stock} units
              </strong>
            </span>
            {rec.daily_velocity > 0 && (
              <span>Velocity: <strong className="text-ss-cream">{rec.daily_velocity}/day</strong></span>
            )}
            {rec.days_remaining >= 0 && rec.daily_velocity > 0 && (
              <span>
                Runway:{" "}
                <strong className={rec.days_remaining <= 7 ? "text-ss-accent" : "text-ss-cream"}>
                  {rec.days_remaining}d
                </strong>
              </span>
            )}
            {rec.reorder_qty > 0 && (
              <span>
                Reorder: <strong className="text-ss-green">{rec.reorder_qty} units</strong>
              </span>
            )}
            {rec.estimated_cost != null && rec.estimated_cost > 0 && (
              <span>Est. cost: <strong className="text-ss-cream">${rec.estimated_cost.toFixed(0)}</strong></span>
            )}
            {rec.supplier && (
              <span>
                Supplier: <strong className="text-ss-cream">{rec.supplier}</strong>
              </span>
            )}
          </div>

          {/* Reasoning toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 font-mono text-[10px] text-ss-muted underline-offset-2 hover:text-ss-cream hover:underline"
          >
            {expanded ? "Hide reasoning ↑" : "Show reasoning ↓"}
          </button>

          {expanded && (
            <p className="mt-2 font-mono text-xs leading-relaxed text-ss-cream/60 border-l-2 border-ss-accent/30 pl-3">
              {rec.reasoning}
            </p>
          )}
        </div>

        {/* Quick action */}
        {rec.supplier_email && rec.status !== "ok" && (
          <a
            href={`mailto:${rec.supplier_email}?subject=Reorder request – ${rec.sku ?? rec.product}&body=Hi ${rec.supplier},%0A%0APlease send a quote for ${rec.reorder_qty} units of ${rec.sku ?? rec.product}.%0A%0AThank you`}
            className="shrink-0 border border-ss-green/30 bg-ss-green/10 px-3 py-1.5 font-mono text-[10px] text-ss-green transition hover:bg-ss-green/20"
          >
            Draft PO →
          </a>
        )}
      </div>
    </li>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────────── */

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="text-ss-muted">
      <rect x="3" y="7" width="14" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
