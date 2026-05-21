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
        {/* Background glow effects */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,77,28,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Top: Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#f4f1ea", letterSpacing: "-1px" }}>
              Stock
            </span>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#ff4d1c", letterSpacing: "-1px" }}>
              Sense
            </span>
          </div>
          <div
            style={{
              border: "1px solid rgba(255,77,28,0.4)",
              padding: "4px 12px",
              fontSize: 11,
              color: "#ff4d1c",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            AI Agent
          </div>
        </div>

        {/* Center: Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "#ff4d1c",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            The AI agent attacking supply chain management
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#f4f1ea",
              letterSpacing: "-3px",
              lineHeight: 0.95,
            }}
          >
            Not a tool.
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 0.95,
              display: "flex",
              gap: 16,
            }}
          >
            <span style={{ color: "#ff4d1c" }}>An agent</span>
            <span style={{ color: "#f4f1ea" }}>that acts.</span>
          </div>
        </div>

        {/* Bottom: Stats + URL */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", gap: 48 }}>
            {[
              { n: "$1.8T", l: "lost to inventory distortion" },
              { n: "34%",   l: "revenue lost to stockouts" },
              { n: "0",     l: "tools that explain why" },
            ].map(({ n, l }) => (
              <div key={n} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#ff4d1c", letterSpacing: "-1px" }}>{n}</span>
                <span style={{ fontSize: 12, color: "#4a4a4a", fontFamily: "monospace", letterSpacing: "0.05em", maxWidth: 140 }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div
              style={{
                background: "#ff4d1c",
                color: "#ffffff",
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              Start for free →
            </div>
            <span style={{ fontSize: 11, color: "#4a4a4a", fontFamily: "monospace" }}>
              stocksense.app
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
