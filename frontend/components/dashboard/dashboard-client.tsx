"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AnalysisResult, Recommendation } from "@/app/api/agent/analyze/route";

// Extended result type — includes graceful degradation fields from the stream route
type StreamAnalysisResult = AnalysisResult & {
  from_cache?: boolean;
  cached_at?: string;
};

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

type Plan = "free" | "starter" | "agent" | "pro" | "agency" | "enterprise";

type PurchaseOrder = {
  id: string;
  supplier_name: string;
  supplier_email: string;
  sku: string;
  product_name: string;
  quantity: number;
  total_cost: number | null;
  urgency: string | null;
  status: "draft" | "approved" | "sent";
  created_at: string;
  sent_at: string | null;
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  starter: "Starter · $49/mo",
  agent: "Pro · $149/mo",
  pro: "Pro · $149/mo",
  agency: "Agency · $399/mo",
  enterprise: "Enterprise",
};

type Props = {
  userEmail: string;
  shopDomain: string | null;
  suppliers: Supplier[];
  businessModel: BusinessModel;
  plan: Plan;
  referralCode: string | null;
  purchaseOrders: PurchaseOrder[];
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

export function DashboardClient({ userEmail, shopDomain, suppliers, businessModel: initialModel, plan, referralCode, purchaseOrders }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StreamAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [agentLog, setAgentLog] = useState<{ type: string; message: string; tool?: string }[]>([]);
  const [model, setModel] = useState<BusinessModel>(initialModel);
  const [savingModel, setSavingModel] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/onboarding");
  }

  async function handleCheckout(planKey: "starter" | "pro" | "agency") {
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

  async function handleShareReport() {
    if (!analysisResult) return;
    setShareBusy(true);
    try {
      const res = await fetch("/api/report/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: analysisResult }),
      });
      const { url } = (await res.json()) as { url?: string };
      if (url) {
        setShareUrl(url);
        await navigator.clipboard.writeText(url).catch(() => {});
      }
    } finally {
      setShareBusy(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    setAgentLog([]);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/agent/stream", { method: "POST" });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Analysis failed." })) as { error?: string };
        setAnalysisError(err.error ?? "Analysis failed. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              message?: string;
              tool?: string;
              result?: AnalysisResult;
              code?: string;
            };

            switch (event.type) {
              case "agent:start":
              case "agent:thinking":
                setAgentLog(prev => [...prev, { type: "thinking", message: event.message ?? "" }]);
                break;
              case "agent:tool_call":
                setAgentLog(prev => [...prev, { type: "tool_call", message: event.message ?? "", tool: event.tool }]);
                break;
              case "agent:tool_result":
                setAgentLog(prev => [...prev, { type: "tool_result", message: event.message ?? "", tool: event.tool }]);
                break;
              case "agent:complete":
                if (event.result) setAnalysisResult(event.result as StreamAnalysisResult);
                break;
              case "agent:error":
                setAnalysisError(event.message ?? "Analysis failed.");
                if (event.code === "LIMIT_REACHED") {
                  setAnalysisError("Monthly analysis limit reached. Upgrade to continue.");
                }
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
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

            {(analyzing || agentLog.length > 0) && (
              <div className="mt-6 border border-white/[0.06] bg-ss-black/60">
                <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2">
                  {analyzing && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ss-accent" />}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ss-muted">
                    Agent reasoning
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto px-4 py-3 space-y-1.5">
                  {agentLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="shrink-0 font-mono text-[10px] mt-0.5">
                        {entry.type === "tool_call"
                          ? <span className="text-ss-accent">→</span>
                          : entry.type === "tool_result"
                          ? <span className="text-ss-green">✓</span>
                          : <span className="text-ss-muted">·</span>}
                      </span>
                      <p className="font-mono text-[11px] leading-relaxed text-ss-cream/70">
                        {entry.tool && (
                          <span className="mr-1.5 border border-white/[0.08] px-1.5 py-0.5 text-[9px] text-ss-muted">
                            {entry.tool}
                          </span>
                        )}
                        {entry.message}
                      </p>
                    </div>
                  ))}
                  {analyzing && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-ss-muted">·</span>
                      <span className="font-mono text-[11px] text-ss-muted animate-pulse">Processing…</span>
                    </div>
                  )}
                </div>
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
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="recs-heading" className="font-sans text-base font-bold text-ss-cream">
              Recommendations
            </h2>
            <div className="flex items-center gap-3">
              {analysisResult && (
                <span className="font-mono text-[11px] text-ss-muted">
                  {analysisResult.total_skus_analyzed} SKUs · {analysisResult.items_needing_attention} urgent
                </span>
              )}
              {analysisResult && (
                <button
                  type="button"
                  onClick={() => void handleShareReport()}
                  disabled={shareBusy}
                  className="border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] text-ss-muted transition hover:border-ss-accent/40 hover:text-ss-cream disabled:opacity-50"
                >
                  {shareBusy ? "…" : shareUrl ? "✓ Link copied!" : "↗ Share report"}
                </button>
              )}
            </div>
          </div>
          {shareUrl && (
            <div className="mb-4 border border-ss-green/30 bg-ss-green/5 px-4 py-2 flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] text-ss-green truncate">{shareUrl}</p>
              <button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)}
                className="shrink-0 font-mono text-[10px] text-ss-green hover:underline">Copy</button>
            </div>
          )}

          {analysisResult?.from_cache && (
            <div
              role="status"
              className="mb-4 border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center gap-3"
            >
              <span className="shrink-0 text-yellow-400" aria-hidden>⚠</span>
              <p className="font-mono text-[11px] leading-relaxed text-yellow-400/90">
                Live agent temporarily unavailable — showing last saved analysis from{" "}
                <strong className="text-yellow-300">
                  {analysisResult.cached_at
                    ? new Date(analysisResult.cached_at).toLocaleString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "a previous session"}
                </strong>.{" "}
                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  className="underline underline-offset-2 hover:text-yellow-200 disabled:opacity-50"
                  disabled={analyzing}
                >
                  Retry live analysis →
                </button>
              </p>
            </div>
          )}

          {analysisResult?.sku_limit_applied && (
            <div className="mb-4 border border-ss-accent/30 bg-ss-accent/5 px-4 py-3 flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-ss-accent/90">
                ⚠ Showing first 10 of {analysisResult.total_skus_in_store} SKUs — upgrade to analyze your full catalog.
              </p>
              <button type="button" onClick={() => void handleCheckout("starter")}
                className="shrink-0 border border-ss-accent/50 px-3 py-1 font-mono text-[10px] text-ss-accent hover:bg-ss-accent/10">
                Upgrade →
              </button>
            </div>
          )}

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
                  <p className={`font-mono text-[10px] uppercase tracking-wider ${analysisResult.from_cache ? "text-yellow-400" : "text-ss-accent"}`}>
                    {analysisResult.from_cache ? "⚠ Cached analysis · " : "→ Analysis complete · "}
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
                        <RecommendationRow key={i} rec={rec} onUpgrade={() => void handleCheckout("starter")} />
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
                        <RecommendationRow key={i} rec={rec} onUpgrade={() => void handleCheckout("starter")} />
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
        {(plan === "free" || plan === "starter") && (
          <section aria-labelledby="upgrade-heading">
            <h2 id="upgrade-heading" className="mb-4 font-sans text-base font-bold text-ss-cream">
              {plan === "free" ? "Upgrade your plan" : "Upgrade for more"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Starter */}
              {plan === "free" && (
                <div className="border border-white/[0.06] bg-ss-surface p-5">
                  <p className="font-sans text-base font-extrabold text-ss-cream">Starter</p>
                  <p className="mt-1 font-sans text-2xl font-extrabold text-ss-accent">$49<span className="font-mono text-xs text-ss-muted">/mo</span></p>
                  <ul className="mt-3 space-y-1">
                    {["50 SKUs", "Invio PO", "Auto-import fornitori", "30-day history", "1 user"].map(f => (
                      <li key={f} className="flex items-center gap-2 font-mono text-[10px] text-ss-cream/70">
                        <span className="text-ss-green">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => void handleCheckout("starter")} disabled={checkoutBusy !== null}
                    className="mt-4 w-full border border-ss-accent/50 bg-ss-accent/10 py-2.5 font-sans text-xs font-bold text-ss-accent transition hover:bg-ss-accent/20 disabled:opacity-50">
                    {checkoutBusy === "starter" ? "Redirecting…" : "Get Starter →"}
                  </button>
                </div>
              )}

              {/* Pro */}
              <div className="relative border border-ss-accent/30 bg-ss-surface p-5">
                <span className="absolute -top-3 left-4 bg-ss-accent px-2 py-0.5 font-mono text-[9px] font-bold text-white">MOST POPULAR</span>
                <p className="font-sans text-base font-extrabold text-ss-cream">Pro</p>
                <p className="mt-1 font-sans text-2xl font-extrabold text-ss-accent">$149<span className="font-mono text-xs text-ss-muted">/mo</span></p>
                <ul className="mt-3 space-y-1">
                  {["SKU illimitati", "Tutti i canali", "PO autonomi", "90-day history", "3 utenti", "Report export"].map(f => (
                    <li key={f} className="flex items-center gap-2 font-mono text-[10px] text-ss-cream/70">
                      <span className="text-ss-green">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => void handleCheckout("pro")} disabled={checkoutBusy !== null}
                  className="mt-4 w-full bg-ss-accent py-2.5 font-sans text-xs font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50">
                  {checkoutBusy === "pro" ? "Redirecting…" : "Get Pro →"}
                </button>
              </div>

              {/* Agency */}
              <div className="border border-white/[0.06] bg-ss-surface p-5">
                <p className="font-sans text-base font-extrabold text-ss-cream">Agency</p>
                <p className="mt-1 font-sans text-2xl font-extrabold text-ss-accent">$399<span className="font-mono text-xs text-ss-muted">/mo</span></p>
                <ul className="mt-3 space-y-1">
                  {["Fino a 5 store", "10 utenti", "History illimitata", "Report export", "Support dedicato"].map(f => (
                    <li key={f} className="flex items-center gap-2 font-mono text-[10px] text-ss-cream/70">
                      <span className="text-ss-green">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => void handleCheckout("agency")} disabled={checkoutBusy !== null}
                  className="mt-4 w-full border border-white/[0.08] py-2.5 font-sans text-xs font-bold text-ss-cream transition hover:border-ss-accent/40 disabled:opacity-50">
                  {checkoutBusy === "agency" ? "Redirecting…" : "Get Agency →"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Purchase Order History ── */}
        {purchaseOrders.length > 0 && (
          <section aria-labelledby="po-history-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="po-history-heading" className="font-sans text-base font-bold text-ss-cream">
                Purchase order history
              </h2>
              {(plan === "pro" || plan === "agency") && (
                <a
                  href="/api/export"
                  download
                  className="font-mono text-[11px] text-ss-muted underline-offset-2 transition hover:text-ss-green hover:underline"
                >
                  ↓ Export CSV
                </a>
              )}
            </div>
            <div className="border border-white/[0.06] bg-ss-surface divide-y divide-white/[0.04]">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-[9px] px-2 py-0.5 border ${
                        po.status === "sent"
                          ? "border-ss-green/30 bg-ss-green/10 text-ss-green"
                          : "border-white/[0.08] text-ss-muted"
                      }`}>
                        {po.status.toUpperCase()}
                      </span>
                      <p className="font-sans text-sm font-bold text-ss-cream truncate">
                        {po.product_name}
                      </p>
                      <span className="font-mono text-[10px] text-ss-muted">{po.sku}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-ss-muted">
                      {po.supplier_name} ·{" "}
                      {new Date(po.created_at).toLocaleDateString("en-GB")}
                      {po.sent_at && (
                        <span className="text-ss-green"> · sent {new Date(po.sent_at).toLocaleDateString("en-GB")}</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-bold text-ss-cream">
                      {po.quantity} units
                    </p>
                    {po.total_cost != null && po.total_cost > 0 && (
                      <p className="font-mono text-[10px] text-ss-muted">
                        ${po.total_cost.toFixed(0)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Team ── */}
        <section aria-labelledby="team-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="team-heading" className="font-sans text-base font-bold text-ss-cream">
              Team
            </h2>
            <span className="font-mono text-[11px] text-ss-muted">
              {plan === "free" || plan === "starter" ? "1" : plan === "pro" ? "3" : plan === "agency" ? "10" : "1"} seat{plan === "pro" || plan === "agency" ? "s" : ""} available
            </span>
          </div>
          <div className="border border-white/[0.06] bg-ss-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-sans text-sm font-bold text-ss-cream">
                  {userEmail}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-ss-muted">Owner · {PLAN_LABELS[plan as Plan] ?? "Free"}</p>
              </div>
              <span className="border border-ss-green/30 bg-ss-green/10 px-2.5 py-1 font-mono text-[10px] text-ss-green">
                Active
              </span>
            </div>
            {(plan === "pro" || plan === "agency") ? (
              <div className="mt-4 border-t border-white/[0.04] pt-4">
                <p className="font-mono text-[11px] text-ss-muted">
                  Team invitations — coming soon. You&apos;ll be able to invite up to{" "}
                  <strong className="text-ss-cream">{plan === "pro" ? "2 more" : "9 more"}</strong> team members.
                </p>
              </div>
            ) : (
              <div className="mt-4 border-t border-white/[0.04] pt-4 flex items-center justify-between">
                <p className="font-mono text-[11px] text-ss-muted">
                  Upgrade to Pro for 3 users, Agency for 10.
                </p>
                <button type="button" onClick={() => void handleCheckout("pro")}
                  className="font-mono text-[10px] text-ss-accent underline-offset-2 hover:underline">
                  Upgrade →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Referral ── */}
        {referralCode && (
          <section aria-labelledby="referral-heading">
            <div className="border border-white/[0.06] bg-ss-surface p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 id="referral-heading" className="font-sans text-base font-bold text-ss-cream">
                    Give a friend 1 month free
                  </h2>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-ss-muted">
                    Share your referral link. When they upgrade, you both get 1 month free.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="border border-white/[0.06] bg-ss-black px-3 py-1.5 font-mono text-[11px] text-ss-green">
                      {process.env.NEXT_PUBLIC_APP_URL ?? "https://stocksense-interlutyinc-wqs-projects.vercel.app"}/r/{referralCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(
                        `${process.env.NEXT_PUBLIC_APP_URL ?? "https://stocksense-interlutyinc-wqs-projects.vercel.app"}/r/${referralCode}`
                      )}
                      className="border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] text-ss-muted transition hover:border-ss-green/40 hover:text-ss-green"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ss-muted">Your code</p>
                  <p className="font-sans text-2xl font-extrabold text-ss-accent">{referralCode}</p>
                </div>
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

function RecommendationRow({ rec, onUpgrade }: { rec: Recommendation; onUpgrade: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSendPO() {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/po/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: rec.supplier ?? "Unknown",
          supplierEmail: rec.supplier_email,
          productName: rec.product,
          sku: rec.sku,
          quantity: rec.reorder_qty,
          estimatedCost: rec.estimated_cost,
          urgency: rec.urgency,
          reasoning: rec.reasoning,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setSent(true);
      } else {
        setSendError(data.error ?? "Failed to send PO");
      }
    } catch {
      setSendError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

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

        {/* Send PO action */}
        {rec.status !== "ok" && rec.reorder_qty > 0 && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            {sent ? (
              <span className="border border-ss-green/30 bg-ss-green/10 px-3 py-1.5 font-mono text-[10px] text-ss-green">
                ✓ PO sent
              </span>
            ) : rec.supplier_email ? (
              <button
                type="button"
                onClick={() => void handleSendPO()}
                disabled={sending}
                className="border border-ss-green/30 bg-ss-green/10 px-3 py-1.5 font-mono text-[10px] text-ss-green transition hover:bg-ss-green/20 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Approve & Send PO →"}
              </button>
            ) : (
              <span className="font-mono text-[9px] text-ss-muted">No supplier email</span>
            )}
            {sendError?.includes("Upgrade") ? (
              <button type="button" onClick={onUpgrade}
                className="font-mono text-[9px] text-ss-accent underline">
                Upgrade to send POs →
              </button>
            ) : sendError ? (
              <p className="font-mono text-[9px] text-ss-accent max-w-[160px] text-right">{sendError}</p>
            ) : null}
          </div>
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
