import type { MetadataRoute } from "next";

const BASE = "https://stocksense-interlutyinc-wqs-projects.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/marketing"],
        disallow: ["/dashboard", "/onboarding", "/api/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
