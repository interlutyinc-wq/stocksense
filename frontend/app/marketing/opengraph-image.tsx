import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StockSense — The AI Agent for Supply Chain Management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080808",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glows */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,28,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -80, left: 200, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 70%)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#f4f1ea", letterSpacing: "-1px" }}>Stock</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#ff4d1c", letterSpacing: "-1px" }}>Sense</span>
          </div>
          <span style={{ fontSize: 10, color: "#4a4a4a", fontFamily: "monospace", letterSpacing: "0.2em", border: "1px solid rgba(255,255,255,0.08)", padding: "3px 10px" }}>
            AI AGENT · NOT A TOOL
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", gap: 80, alignItems: "center", flex: 1, paddingTop: 40, paddingBottom: 40 }}>
          {/* Left: Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <span style={{ fontSize: 11, color: "#ff4d1c", letterSpacing: "0.25em", fontFamily: "monospace", textTransform: "uppercase" }}>
              Supply chain management
            </span>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#f4f1ea", letterSpacing: "-2px", lineHeight: 1 }}>
              Reasons.
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#ff4d1c", letterSpacing: "-2px", lineHeight: 1 }}>
              Decides.
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#f4f1ea", letterSpacing: "-2px", lineHeight: 1 }}>
              Acts.
            </div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#4a4a4a", fontFamily: "monospace", lineHeight: 1.6, maxWidth: 460 }}>
              Analyzes live inventory · Matches suppliers · Sends purchase orders automatically
            </div>
          </div>

          {/* Right: Agent log mockup */}
          <div
            style={{
              background: "#141414",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: 340,
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d1c" }} />
              <span style={{ fontSize: 10, color: "#4a4a4a", fontFamily: "monospace", letterSpacing: "0.15em" }}>AGENT REASONING</span>
            </div>
            {[
              { icon: "→", color: "#ff4d1c", text: "get_inventory  Fetching 150 SKUs..." },
              { icon: "✓", color: "#00e5a0", text: "Found 150 SKUs — 12 critical" },
              { icon: "→", color: "#ff4d1c", text: "get_sales_velocity  SKU-001..." },
              { icon: "✓", color: "#00e5a0", text: "Velocity: 3.2/day — 2 days left" },
              { icon: "→", color: "#ff4d1c", text: "get_supplier_history  Widrop..." },
              { icon: "✓", color: "#00e5a0", text: "Lead time: 7 days avg" },
              { icon: "·", color: "#4a4a4a", text: "Generating recommendations..." },
            ].map(({ icon, color, text }, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 10, color, fontFamily: "monospace", width: 10, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["Free plan", "Starter $49/mo", "Pro $149/mo", "Agency $399/mo"].map(p => (
              <span key={p} style={{ fontSize: 10, color: "#4a4a4a", fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.06)", padding: "3px 10px" }}>{p}</span>
            ))}
          </div>
          <div style={{ background: "#ff4d1c", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 20px", letterSpacing: "0.05em" }}>
            Start for free →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
