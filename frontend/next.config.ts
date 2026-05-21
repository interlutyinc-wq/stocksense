import type { NextConfig } from "next";

// ── Security headers ──────────────────────────────────────────────────────────
// Applied to all routes. Defence-in-depth against common web vulnerabilities.

const securityHeaders = [
  {
    // Prevent clickjacking — disallow embedding in iframes
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Control referrer information in requests
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // HSTS — force HTTPS for 1 year, include subdomains
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Disable browser features not needed by the app
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",       // Allow Stripe payment on same origin
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", "),
  },
  {
    // Content Security Policy
    // Strict policy — only allow resources from known trusted sources
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + Next.js inline scripts + PostHog + Sentry
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://us-assets.i.posthog.com",
      // Styles: self + inline (Tailwind)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs + Shopify CDN
      "img-src 'self' data: blob: https://*.myshopify.com https://cdn.shopify.com",
      // Connect: API calls to known services
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://*.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com https://api.stripe.com https://api.resend.com",
      // Frames: Stripe embedded
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Workers
      "worker-src 'self' blob:",
    ].join("; "),
  },
  {
    // DNS prefetch for performance
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

// ── Next.js config ────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  // Security headers on all routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Redirect /health → /api/health (convenience alias)
  async redirects() {
    return [
      {
        source: "/health",
        destination: "/api/health",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
