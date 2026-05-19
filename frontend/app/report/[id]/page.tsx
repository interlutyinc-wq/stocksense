import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AnalysisResult, Recommendation } from "@/app/api/agent/analyze/route";

export const dynamic = "force-dynamic";

const URGENCY_COLORS: Record<string, string> = {
  critical: "#ff4d1c",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
};

export default async function SharedReportPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from("shared_reports")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !report) notFound();

  // Increment views
  await supabase
    .from("shared_reports")
    .update({ views: report.views + 1 })
    .eq("id", params.id);

  const result = report.data as unknown as AnalysisResult;
  const urgent = result.recommendations?.filter(
    (r: Recommendation) => r.status === "critical" || r.status === "low"
  ) ?? [];

  return (
    <div style={{ background: "#080808", minHeight: "100vh", fontFamily: "monospace", color: "#f4f1ea" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none", fontFamily: "sans-serif", fontSize: 20, fontWeight: 800, color: "#f4f1ea" }}>
          Stock<span style={{ color: "#ff4d1c" }}>Sense</span>
        </Link>
        <span style={{ fontSize: 11, color: "#4a4a4a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          AI Inventory Report
        </span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
        {/* Meta */}
        <p style={{ fontSize: 10, color: "#ff4d1c", letterSpacing: "0.25em", textTransform: "uppercase", margin: "0 0 8px" }}>
          Inventory Analysis · {report.shop_domain}
        </p>
        <h1 style={{ fontFamily: "sans-serif", fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          AI Supply Chain Report
        </h1>
        <p style={{ fontSize: 12, color: "#4a4a4a", margin: "0 0 32px" }}>
          {new Date(report.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} ·{" "}
          {result.total_skus_analyzed} SKUs analyzed · {result.items_needing_attention} need attention ·{" "}
          {report.views} views
        </p>

        {/* Summary */}
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ fontSize: 10, color: "#4a4a4a", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Agent Summary
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#f4f1ea", margin: 0 }}>{result.summary}</p>
        </div>

        {/* Recommendations */}
        {urgent.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: "#4a4a4a", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 12px" }}>
              Action Required
            </p>
            {urgent.map((rec: Recommendation, i: number) => (
              <div key={i} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", border: `1px solid ${URGENCY_COLORS[rec.urgency] ?? "#4a4a4a"}`, color: URGENCY_COLORS[rec.urgency] ?? "#4a4a4a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {rec.urgency}
                  </span>
                  <span style={{ fontFamily: "sans-serif", fontSize: 14, fontWeight: 700 }}>{rec.product}</span>
                  <span style={{ fontSize: 10, color: "#4a4a4a" }}>{rec.sku}</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
                  <span>Stock: <strong style={{ color: rec.status === "critical" ? "#ff4d1c" : "#f4f1ea" }}>{rec.current_stock} units</strong></span>
                  {rec.daily_velocity > 0 && <span>Velocity: <strong style={{ color: "#f4f1ea" }}>{rec.daily_velocity}/day</strong></span>}
                  {rec.reorder_qty > 0 && <span>Reorder: <strong style={{ color: "#00e5a0" }}>{rec.reorder_qty} units</strong></span>}
                  {rec.supplier && <span>Supplier: <strong style={{ color: "#f4f1ea" }}>{rec.supplier}</strong></span>}
                </div>
                <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6, margin: 0, borderLeft: "2px solid rgba(255,77,28,0.3)", paddingLeft: 10 }}>
                  {rec.reasoning}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "#141414", border: "1px solid rgba(255,77,28,0.2)", padding: "28px 24px", marginTop: 32, textAlign: "center" }}>
          <p style={{ fontFamily: "sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>
            This report was generated by StockSense
          </p>
          <p style={{ fontSize: 12, color: "#4a4a4a", margin: "0 0 20px", lineHeight: 1.6 }}>
            AI agent that analyzes your Shopify inventory and sends purchase orders automatically.
            <br />Free to try — no credit card required.
          </p>
          <a href="https://stocksense-interlutyinc-wqs-projects.vercel.app/onboarding?ref=shared-report"
            style={{ display: "inline-block", background: "#ff4d1c", color: "#fff", fontFamily: "sans-serif", fontSize: 14, fontWeight: 700, padding: "12px 28px", textDecoration: "none", borderRadius: 2 }}>
            Analyze my inventory →
          </a>
        </div>

        <p style={{ fontSize: 10, color: "#4a4a4a", textAlign: "center", marginTop: 24 }}>
          Powered by StockSense · AI supply chain agent ·{" "}
          <a href="https://stocksense-interlutyinc-wqs-projects.vercel.app" style={{ color: "#4a4a4a" }}>
            stocksense-interlutyinc-wqs-projects.vercel.app
          </a>
        </p>
      </div>
    </div>
  );
}
