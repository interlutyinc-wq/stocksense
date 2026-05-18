"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Supplier = {
  id: string;
  name: string;
  email: string;
  skus: string[];
  created_at: string;
};

type Props = {
  userEmail: string;
  shopDomain: string | null;
  suppliers: Supplier[];
};

export function DashboardClient({ userEmail, shopDomain, suppliers }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/onboarding");
  }

  function handleAnalyze() {
    setAnalyzing(true);
    // Placeholder — real agent call goes here
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 2000);
  }

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
              <span className="font-mono text-xs text-ss-cream/70">
                {shopDomain}
              </span>
            </div>
          ) : (
            <span className="hidden font-mono text-xs text-ss-accent/80 sm:block">
              No store connected
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] text-ss-muted sm:block">
            {userEmail}
          </span>
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
        {/* ── Benvenuto ── */}
        <div className="relative overflow-hidden border border-white/[0.06] bg-ss-surface p-6 md:p-8">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{
              background: "rgba(255,77,28,0.5)",
            }}
            aria-hidden
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ss-accent">
            Dashboard
          </p>
          <h1 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-ss-cream md:text-3xl">
            Your agent is ready.
          </h1>
          <p className="mt-2 font-mono text-sm leading-relaxed text-ss-cream/50">
            {shopDomain
              ? `Connected store: `
              : "Connect your Shopify store to get started."}
            {shopDomain && (
              <strong className="text-ss-cream">{shopDomain}</strong>
            )}
          </p>
        </div>

        {/* ── Fornitori ── */}
        <section aria-labelledby="suppliers-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="suppliers-heading"
              className="font-sans text-base font-bold text-ss-cream"
            >
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
                  className="group border border-white/[0.06] bg-ss-surface p-4 transition hover:border-white/[0.12]"
                >
                  {/* Nome */}
                  <p className="font-sans text-sm font-bold text-ss-cream">
                    {s.name}
                  </p>
                  {/* Email */}
                  <p className="mt-1 font-mono text-[11px] text-ss-muted">
                    {s.email}
                  </p>
                  {/* SKUs */}
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

        {/* ── Analizza inventario ── */}
        <section aria-labelledby="analyze-heading">
          <h2
            id="analyze-heading"
            className="mb-4 font-sans text-base font-bold text-ss-cream"
          >
            Inventory analysis
          </h2>

          <div className="border border-white/[0.06] bg-ss-surface p-6 md:p-8">
            <p className="font-mono text-sm leading-relaxed text-ss-cream/55">
              The agent analyzes your sales velocity, supplier lead times, and
              seasonal trends to generate order recommendations with full
              plain-language explanations.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 bg-ss-accent px-8 py-3 font-sans text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#00e5a0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <SpinnerIcon />
                    Agent processing…
                  </>
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
                  ⟳ Agent processing — reasoning through your data…
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Raccomandazioni ── */}
        <section aria-labelledby="recs-heading">
          <h2
            id="recs-heading"
            className="mb-4 font-sans text-base font-bold text-ss-cream"
          >
            Recommendations
          </h2>

          <div className="border border-white/[0.06] bg-ss-surface">
            {!analyzed ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center border border-white/[0.06] bg-ss-black/60">
                  <AgentIcon />
                </div>
                <p className="font-sans text-sm font-bold text-ss-cream">
                  No analysis run yet
                </p>
                <p className="mt-2 max-w-sm font-mono text-xs leading-relaxed text-ss-muted">
                  Click{" "}
                  <strong className="text-ss-cream">Analyze inventory</strong>{" "}
                  to get started — the agent will reason through your data and
                  generate order recommendations with full explanations.
                </p>
              </div>
            ) : (
              /* Placeholder risultato — da sostituire con vera risposta agent */
              <div className="divide-y divide-white/[0.04]">
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ss-accent">
                        → Analysis complete
                      </p>
                      <p className="mt-1 font-sans text-sm font-bold text-ss-cream">
                        No urgent recommendations detected
                      </p>
                      <p className="mt-1 font-mono text-xs text-ss-muted">
                        AI model integration in progress — real recommendations
                        will appear here.
                      </p>
                    </div>
                    <span className="shrink-0 border border-ss-green/30 bg-ss-green/10 px-2.5 py-1 font-mono text-[10px] text-ss-green">
                      OK
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-4 border-t border-white/[0.04] px-6 py-6 text-center md:px-12">
        <p className="font-mono text-[10px] text-ss-muted">
          StockSense · Reasons · Decides · Explains · Acts
        </p>
      </footer>
    </div>
  );
}

/* ── Micro-componenti icone ── */

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="text-ss-muted"
    >
      <rect x="3" y="7" width="14" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
