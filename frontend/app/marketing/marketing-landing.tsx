"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const TICKER = [
  "Reasons",
  "Decides",
  "Acts",
  "Explains",
  "Learns",
  "AI-Native",
  "Not a Dashboard",
  "Not an Alert",
  "An Agent",
] as const;

function scrollToWaitlist() {
  document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
}

export function MarketingLanding() {
  const curRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const prev = document.body.style.cursor;
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = prev;
    };
  }, []);

  useEffect(() => {
    const cur = curRef.current;
    const ring = ringRef.current;
    if (!cur || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = `${mx - 5}px`;
      cur.style.top = `${my - 5}px`;
    };

    const loop = () => {
      rx += (mx - rx - 17) * 0.12;
      ry += (my - ry - 17) * 0.12;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      raf = requestAnimationFrame(loop);
    };

    document.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector(".marketing-page");
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const onWaitlistSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      setSubmitting(true);
      try {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Request failed");
        setDone(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not save. Try again later.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [email],
  );

  return (
    <div className="marketing-page">
      <div ref={curRef} className="mk-cur" aria-hidden />
      <div ref={ringRef} className="mk-ring" aria-hidden />

      <nav>
        <Link href="/" className="logo">
          Stock<em>Sense</em>
        </Link>
        <div className="nav-pill">AI Agent · Not a Tool</div>
        <a href="/onboarding" className="nav-cta">
          Get started →
        </a>
      </nav>

      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-glow2" />

        <div className="hero-eyebrow">The first AI-native supply chain agent</div>

        <h1>
          Not a tool.
          <br />
          An <span className="accent">agent</span>
          <br />
          that <span className="stroke">thinks.</span>
        </h1>

        <p className="hero-sub">
          Every inventory tool tells you what&apos;s happening.{" "}
          <strong>StockSense decides what to do about it.</strong> It reasons
          through your data, understands your suppliers, and acts —
          autonomously — before stockouts cost you money.
        </p>

        <div className="hero-actions">
          <a href="/onboarding" className="btn-main">
            Start for free →
          </a>
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              document
                .getElementById("difference")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            See the difference ↓
          </button>
        </div>

        <div className="hero-trust">
          <span>✓ No credit card required</span>
          <span>✓ Free plan forever</span>
          <span>✓ Connect Shopify in 2 minutes</span>
          <span>✓ Cancel anytime</span>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-inner">
          {[...TICKER, ...TICKER].map((label, i) => (
            <span key={i}>
              {label} <span className="td">◆</span>
            </span>
          ))}
        </div>
      </div>

      <section className="difference" id="difference">
        <div className="diff-label">The difference</div>

        <div className="diff-grid">
          <div>
            <div className="diff-col-title old">Every other tool</div>
            <div className="diff-item old-item">
              Shows you a dashboard of stock levels
            </div>
            <div className="diff-item old-item">
              Sends an alert when you&apos;re already too late
            </div>
            <div className="diff-item old-item">Tells you what happened</div>
            <div className="diff-item old-item">
              You still decide what to order and when
            </div>
            <div className="diff-item old-item">
              Black box — you don&apos;t know why it flagged something
            </div>
            <div className="diff-item old-item">
              Generic AI layered on old architecture
            </div>
            <div className="diff-item old-item">
              Works for Amazon OR Shopify
            </div>
          </div>

          <div className="diff-vs">
            <div className="vs-circle">VS</div>
          </div>

          <div>
            <div className="diff-col-title new">StockSense Agent</div>
            <div className="diff-item new-item">
              <strong>Reasons</strong> through your data like an ops manager
            </div>
            <div className="diff-item new-item">
              Predicts stockouts <strong>weeks before</strong> they happen
            </div>
            <div className="diff-item new-item">
              Tells you what to do — and <strong>exactly why</strong>
            </div>
            <div className="diff-item new-item">
              Generates purchase orders <strong>autonomously</strong>
            </div>
            <div className="diff-item new-item">
              <strong>Explains every decision</strong> in plain language
            </div>
            <div className="diff-item new-item">
              <strong>Born AI-first</strong> — agent architecture from day one
            </div>
            <div className="diff-item new-item">
              Amazon + Shopify + WooCommerce + <strong>all channels</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="stat reveal">
          <div className="stat-n">$1.8T</div>
          <div className="stat-l">
            lost globally per year to inventory distortion
          </div>
        </div>
        <div className="stat reveal">
          <div className="stat-n">34%</div>
          <div className="stat-l">
            avg revenue lost to stockouts annually per seller
          </div>
        </div>
        <div className="stat reveal">
          <div className="stat-n">72h</div>
          <div className="stat-l">
            avg time for existing tools to detect an issue
          </div>
        </div>
        <div className="stat reveal">
          <div className="stat-n">0</div>
          <div className="stat-l">
            tools that explain WHY they make a recommendation
          </div>
        </div>
      </div>

      <section className="agent-section">
        <div className="agent-grid">
          <div>
            <div className="section-eyebrow">How it works</div>
            <h2>
              The agent
              <br />
              that reasons
              <br />
              <span style={{ color: "var(--accent)" }}>out loud.</span>
            </h2>
            <div className="steps">
              <div className="step reveal">
                <div className="step-n">01</div>
                <div className="step-body">
                  <div className="step-title">Observes your entire operation</div>
                  <div className="step-desc">
                    Connects to every channel — Amazon, Shopify, WooCommerce.
                    Ingests sales velocity, supplier lead times, seasonal
                    patterns. Builds a live model of your specific business.
                  </div>
                </div>
              </div>
              <div className="step reveal">
                <div className="step-n">02</div>
                <div className="step-body">
                  <div className="step-title">Reasons through the data</div>
                  <div className="step-desc">
                    Not just &quot;stock is low.&quot; It reasons: given your
                    velocity, your supplier&apos;s real lead time, the upcoming
                    season — what does this mean? What&apos;s the financial
                    cost of inaction?
                  </div>
                </div>
              </div>
              <div className="step reveal">
                <div className="step-n">03</div>
                <div className="step-body">
                  <div className="step-title">Decides and explains</div>
                  <div className="step-desc">
                    Generates a specific recommendation with full reasoning in
                    plain language. Not a black box. You see exactly why the
                    agent decided what it decided.
                  </div>
                </div>
              </div>
              <div className="step reveal">
                <div className="step-n">04</div>
                <div className="step-body">
                  <div className="step-title">Acts with your approval</div>
                  <div className="step-desc">
                    Drafts purchase orders, optimizes supplier consolidation,
                    updates reorder points. One click to approve. You stay in
                    control — the agent does the work.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="agent-ui reveal">
            <div className="ui-bar">
              <div className="ui-dot" style={{ background: "#ff5f57" }} />
              <div className="ui-dot" style={{ background: "#febc2e" }} />
              <div className="ui-dot" style={{ background: "#28c840" }} />
              <span style={{ marginLeft: 8 }}>StockSense · Agent Reasoning</span>
            </div>
            <div className="ui-body">
              <div className="reasoning-step">
                <div className="step-label observe">→ Observing</div>
                <div className="step-text">
                  Helmet Safety V2 — current stock:{" "}
                  <strong>8 units</strong>. Daily velocity:{" "}
                  <strong>3.8 units/day</strong>. Days remaining:{" "}
                  <span className="warn">~2 days</span>.
                </div>
              </div>
              <div className="reasoning-step">
                <div className="step-label reason">→ Reasoning</div>
                <div className="step-text">
                  Supplier SafeGear EU has a <strong>14-day lead time</strong>.
                  Summer season starts in <strong>28 days</strong> — historical
                  demand increases <strong>+40%</strong>. If we order today,
                  stock arrives in 14 days. At current velocity we&apos;ll be
                  empty in <span className="warn">2 days</span>. This is a{" "}
                  <span className="warn">
                    critical gap of 12 days with zero stock
                  </span>{" "}
                  during pre-peak season.
                </div>
              </div>
              <div className="reasoning-step">
                <div className="step-label decide">→ Decision</div>
                <div className="step-text">
                  Order <strong>180 units</strong> immediately. This covers the
                  12-day gap + 90 days of summer-adjusted demand. Consolidating
                  with SKU-003 order to same supplier saves{" "}
                  <span className="hi">~€340 in shipping</span>.
                </div>
              </div>
              <div className="reasoning-step" style={{ borderBottom: "none" }}>
                <div className="step-label act">→ Action Generated</div>
                <div className="step-action">
                  <span>
                    📋 Purchase Order · SafeGear EU · 180 units · €4,320
                  </span>
                  <span
                    style={{
                      color: "rgba(0,229,160,0.6)",
                      fontSize: 10,
                    }}
                  >
                    Awaiting approval →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-preview">
        <div className="section-eyebrow" style={{ justifyContent: "center" }}>
          The product
        </div>
        <h2 style={{ textAlign: "center" }}>
          See the agent
          <br />
          <span className="accent">in action.</span>
        </h2>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, maxWidth: 520, margin: "16px auto 0" }}>
          Real output from StockSense. The agent analyzes your live Shopify inventory and tells you exactly what to do — and why.
        </p>

        <div className="mock-window reveal">
          <div className="mock-bar">
            <span className="mock-dot" style={{ background: "#ff5f57" }} />
            <span className="mock-dot" style={{ background: "#febc2e" }} />
            <span className="mock-dot" style={{ background: "#28c840" }} />
            <span style={{ marginLeft: 10, fontSize: 11, color: "#4a4a4a" }}>StockSense · Recommendations</span>
          </div>
          <div className="mock-body">
            <div className="mock-summary">
              <span className="mock-label">→ ANALYSIS COMPLETE</span>
              <p>3 SKUs need immediate attention. 2 critical stockouts in the next 7 days. Agent has drafted purchase orders for your approval.</p>
            </div>

            {[
              {
                status: "critical",
                product: "Wireless Earbuds Pro X",
                sku: "WEP-001",
                stock: 4,
                velocity: "2.8/day",
                runway: "1d",
                reorder: 200,
                cost: "$840",
                supplier: "TechSource EU",
                reasoning: "At 2.8 units/day velocity with only 4 units remaining, you will hit zero stock in 1 day. Supplier TechSource EU has a 5-day lead time — order immediately to avoid a 4-day stockout during peak demand.",
              },
              {
                status: "low",
                product: "Standing Desk Frame",
                sku: "SDF-003",
                stock: 18,
                velocity: "1.2/day",
                runway: "15d",
                reorder: 80,
                cost: "$3,200",
                supplier: "ErgoSupply",
                reasoning: "15 days of runway with supplier lead time of 12 days leaves a 3-day safety margin. Reorder now to maintain buffer stock heading into the weekend sales spike.",
              },
            ].map((rec, i) => (
              <div key={i} className={`mock-rec mock-rec-${rec.status}`}>
                <div className="mock-rec-header">
                  <span className={`mock-badge mock-badge-${rec.status}`}>{rec.status}</span>
                  <span className="mock-product">{rec.product}</span>
                  <span className="mock-sku">{rec.sku}</span>
                </div>
                <div className="mock-metrics">
                  <span>Stock: <strong style={{ color: rec.status === "critical" ? "#ff4d1c" : "#f4f1ea" }}>{rec.stock} units</strong></span>
                  <span>Velocity: <strong>{rec.velocity}</strong></span>
                  <span>Runway: <strong style={{ color: rec.status === "critical" ? "#ff4d1c" : "#f59e0b" }}>{rec.runway}</strong></span>
                  <span>Reorder: <strong style={{ color: "#00e5a0" }}>{rec.reorder} units</strong></span>
                  <span>Est. cost: <strong>{rec.cost}</strong></span>
                  <span>Supplier: <strong>{rec.supplier}</strong></span>
                </div>
                <div className="mock-reasoning">
                  <span className="mock-reason-label">Agent reasoning</span>
                  <p>{rec.reasoning}</p>
                </div>
                <div className="mock-actions">
                  <button className="mock-btn-po">Approve & Send PO →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="section-eyebrow" style={{ justifyContent: "center" }}>
          FAQ
        </div>
        <h2 style={{ textAlign: "center" }}>Common questions</h2>
        <div className="faq-grid">
          {[
            {
              q: "Does StockSense work with my Shopify store?",
              a: "Yes. Connect in 2 minutes via OAuth — StockSense reads your live inventory, products, and orders. No manual export needed.",
            },
            {
              q: "What's the difference from Linnworks or Inventory Planner?",
              a: "Those tools show dashboards and alerts. StockSense reasons through your data and acts — it tells you exactly what to order, why, and sends the purchase order to your supplier automatically.",
            },
            {
              q: "Does it work for dropshipping?",
              a: "Yes. StockSense supports own inventory, dropshipping, and hybrid models. For dropshipping it focuses on fulfillment risk and sales velocity instead of reorder quantities.",
            },
            {
              q: "How does the AI explain its decisions?",
              a: "Every recommendation includes a plain-language reasoning block — velocity, days of stock remaining, supplier lead time, estimated cost. No black box.",
            },
            {
              q: "Can I try it for free?",
              a: "Yes. The Free plan lets you analyze up to 10 SKUs once a month, no credit card required. Upgrade to Starter ($49/mo) to unlock full features.",
            },
            {
              q: "How are purchase orders sent?",
              a: "StockSense generates the PO and emails it directly to your supplier with one click. The email includes product, SKU, quantity, estimated cost, and AI reasoning.",
            },
          ].map((item, i) => (
            <div key={i} className="faq-item">
              <div className="faq-q">{item.q}</div>
              <div className="faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing">
        <div className="section-eyebrow" style={{ justifyContent: "center" }}>
          Pricing
        </div>
        <div className="urgency-banner reveal">
          🎁 First 100 merchants get <strong>3 months free</strong> on any paid plan
        </div>
        <h2 style={{ textAlign: "center", marginBottom: 0 }}>
          Simple.
          <br />
          Transparent.
        </h2>

        <div className="pricing-grid">
          <div className="plan reveal">
            <div className="plan-name">Free</div>
            <div className="plan-price">
              <sup>$</sup>0<small>/mo</small>
            </div>
            <div className="plan-desc">
              Try StockSense with your first store. No credit card required.
            </div>
            <ul className="plan-feats">
              <li>10 SKUs analyzed</li>
              <li>1 AI analysis per month</li>
              <li>View recommendations</li>
              <li>1 supplier</li>
            </ul>
            <a href="/onboarding" className="plan-btn outline">
              Start free →
            </a>
          </div>

          <div className="plan reveal">
            <div className="plan-name">Starter</div>
            <div className="plan-price">
              <sup>$</sup>49<small>/mo</small>
            </div>
            <div className="plan-desc">
              For solo operators ready to automate their supply chain.
            </div>
            <ul className="plan-feats">
              <li>Up to 50 SKUs</li>
              <li>Unlimited AI analyses</li>
              <li>Send purchase orders</li>
              <li>Auto-import suppliers</li>
              <li>30-day PO history</li>
              <li>1 user</li>
            </ul>
            <a href="/onboarding" className="plan-btn outline">
              Get Starter →
            </a>
          </div>

          <div className="plan hot reveal">
            <div className="plan-badge">Most Popular</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">
              <sup>$</sup>149<small>/mo</small>
            </div>
            <div className="plan-desc">
              Full autonomous agent for scaling ecommerce brands.
            </div>
            <ul className="plan-feats">
              <li>Unlimited SKUs</li>
              <li>Autonomous PO generation</li>
              <li>All business models</li>
              <li>Export CSV reports</li>
              <li>90-day history</li>
              <li>3 users</li>
            </ul>
            <a href="/onboarding" className="plan-btn filled">
              Get Pro →
            </a>
          </div>

          <div className="plan reveal">
            <div className="plan-name">Agency</div>
            <div className="plan-price">
              <sup>$</sup>399<small>/mo</small>
            </div>
            <div className="plan-desc">
              For agencies managing multiple Shopify stores.
            </div>
            <ul className="plan-feats">
              <li>Up to 5 stores</li>
              <li>Unlimited SKUs</li>
              <li>Full history</li>
              <li>Export reports</li>
              <li>10 users</li>
              <li>Priority support</li>
            </ul>
            <a href="/onboarding" className="plan-btn outline">
              Get Agency →
            </a>
          </div>
        </div>
      </section>

      <section className="waitlist" id="waitlist">
        <h2 className="wl-title reveal">
          Stop
          <br />
          managing.
          <br />
          <span className="stroke">Start</span>
          <br />
          <span style={{ color: "var(--accent)" }}>delegating.</span>
        </h2>
        <p className="wl-sub reveal">
          Live now. First 100 merchants get 3 months free.
        </p>

        {!done ? (
          <form className="wl-form reveal" onSubmit={onWaitlistSubmit}>
            <input
              type="email"
              className="wl-input"
              placeholder="your@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setInvalid(false);
              }}
              style={
                invalid
                  ? { borderColor: "var(--accent)" }
                  : { borderColor: undefined }
              }
            />
            <button type="submit" className="wl-btn" disabled={submitting}>
              {submitting ? "Sending…" : "Join →"}
            </button>
          </form>
        ) : null}

        <div
          className={`wl-error${error ? " is-visible" : ""}`}
          role={error ? "alert" : undefined}
        >
          {error ?? ""}
        </div>

        <div className={`wl-success${done ? " is-visible" : ""}`}>
          ✓ You&apos;re in. We&apos;ll reach out soon.
        </div>

        <p className="wl-note reveal">
          No credit card. No spam. Cancel anytime.
        </p>
      </section>

      <footer>
        <div className="footer-logo">
          Stock<em>Sense</em>
        </div>
        <div className="footer-note">
          © 2026 StockSense · AI-native supply chain agent
        </div>
      </footer>
    </div>
  );
}
