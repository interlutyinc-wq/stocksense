import type { MetadataRoute } from "next";

const BASE = "https://stocksense-interlutyinc-wqs-projects.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/marketing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/onboarding`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
