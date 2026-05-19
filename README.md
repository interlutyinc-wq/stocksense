# StockSense — AI Supply Chain Agent for Shopify

**StockSense** is an AI-native supply chain agent for Shopify merchants. Unlike traditional inventory tools that show dashboards and send alerts, StockSense reasons through your live inventory data and acts — generating purchase orders with full plain-language explanations.

🔗 **Live:** https://stocksense-interlutyinc-wqs-projects.vercel.app  
🏢 **Company:** Interluty Inc. (C-Corp, Delaware, USA)

---

## What StockSense Does

1. **Connects** to your Shopify store via OAuth and fetches live inventory
2. **Reasons** through stock levels, sales velocity, supplier lead times, and seasonal patterns
3. **Recommends** exactly what to reorder, how much, and why — in plain language
4. **Acts** — sends purchase orders directly to your suppliers via email, one click

**Supports three business models:**
- Own inventory (traditional reorder logic)
- Dropshipping (fulfillment risk and velocity analysis)
- Hybrid (mixed logic based on supplier matching)

---

## Why StockSense Is Different

| Traditional tools | StockSense |
|---|---|
| Show dashboards | Reasons through data |
| Send alerts when it's too late | Predicts stockouts weeks ahead |
| Tell you what happened | Tell you what to do — and why |
| You decide what to order | Generates purchase orders autonomously |
| Black box | Explains every decision in plain language |

---

## Pricing

| Plan | Price | SKUs | Key Features |
|---|---|---|---|
| Free | $0 | 10 | 1 analysis/month, view recommendations |
| Starter | $49/mo | 50 | Unlimited analyses, PO sending, all business models |
| Pro | $149/mo | Unlimited | Export reports, 3 users, 90-day history |
| Agency | $399/mo | Unlimited | 5 stores, 10 users, unlimited history |

---

## Tech Stack

- **Frontend:** Next.js 16.2 + TypeScript + Tailwind CSS v4
- **Auth:** Supabase Auth (email + Google OAuth)
- **Database:** Supabase PostgreSQL with RLS
- **AI Engine:** Anthropic Claude Sonnet 4.6
- **Payments:** Stripe (subscriptions + customer portal)
- **Email:** Resend (transactional PO emails)
- **Shopify:** Partner OAuth App (Admin API)
- **Deploy:** Vercel

---

## Key Features

- ✅ Live Shopify inventory analysis via Admin API
- ✅ AI reasoning with `daily_velocity`, `days_remaining`, `urgency`, `estimated_cost`
- ✅ Three business model prompts (inventory / dropshipping / hybrid)
- ✅ Automated purchase order generation and email delivery
- ✅ Stripe subscription billing (4 plans)
- ✅ Feature gating per plan (SKU limits, PO sending, export, auto-import)
- ✅ Supplier auto-import from Shopify vendor field
- ✅ Purchase order history with CSV export (Pro/Agency)
- ✅ Google OAuth + email/password authentication

---

## Competitors

StockSense competes with: Linnworks, Brightpearl, Inventory Planner, Skubana, Cin7.

**Key differentiator:** Every competitor is a dashboard. StockSense is an agent that explains its reasoning and acts autonomously.

---

## Company

Built by **Albion Qorraj**, founder of Interluty Inc.  
Previously scaled an ecommerce store to $500k in 5 months.  
AWS Certified Solutions Architect.

Applied to Y Combinator S26.
