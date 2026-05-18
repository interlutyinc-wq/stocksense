# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StockSense** is an AI-native supply chain agent for e-commerce merchants. It connects to Shopify stores, reads live inventory data, and uses Claude (Anthropic API) to generate actionable reorder recommendations. The product supports three business models: own inventory, dropshipping, and hybrid.

**Company:** C-Corp Delaware (USA)  
**Live URL:** https://stocksense-interlutyinc-wqs-projects.vercel.app  
**Stack:** Next.js 16.2.6 · TypeScript · Supabase · Shopify OAuth · Anthropic API · Vercel · PostHog

---

## Repository Structure

```
stocksense/
├── frontend/          — Next.js app (the entire product)
│   ├── app/           — App Router pages and API routes
│   ├── components/    — React components
│   ├── lib/           — Supabase clients, Shopify utilities
│   └── public/        — Static assets
└── supabase/
    └── migrations/    — SQL migration files (apply manually via SQL Editor)
```

The repo root has a `package.json` but the actual app lives in `frontend/`. Always `cd frontend` before running npm commands.

---

## Development Commands

```bash
cd frontend
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build (--webpack flag set in package.json)
npm run lint       # ESLint
npx tsc --noEmit   # Type-check without emitting files
```

Build uses `--webpack` explicitly (not Turbopack) — do not remove this flag.

---

## Architecture

### Frontend (`frontend/app/`)

Next.js App Router with a mix of Server Components and Client Components.

| Route | Type | Purpose |
|---|---|---|
| `/` | Client (SC check) | Homepage — redirects logged-in users to `/dashboard` |
| `/marketing` | Static | Public landing page with waitlist form |
| `/onboarding` | Dynamic | 3-step wizard: Account → Shopify → Suppliers |
| `/dashboard` | Dynamic SC | Main app — fetches user data server-side, passes to client |
| `/auth/callback` | Route Handler | Supabase PKCE code exchange after OAuth |
| `/auth/reset-password` | Static | Password reset — exchanges code client-side |
| `/api/shopify/auth` | Route Handler | Initiates Shopify OAuth redirect |
| `/api/shopify/callback` | Route Handler | Handles Shopify OAuth callback, saves access token |
| `/api/shopify/vendors` | Route Handler | Auto-detects suppliers from Shopify product vendor field |
| `/api/agent/analyze` | Route Handler | Core AI engine — fetches inventory + calls Claude |
| `/api/waitlist` | Route Handler | Public waitlist signup |

### Supabase Clients

Two separate clients — never mix them:

- `lib/supabase/server.ts` — `createServerClient()` for Server Components and Route Handlers (reads/sets cookies)
- `lib/supabase/client.ts` — `createBrowserClient()` for Client Components (browser only)

### Database Schema

All tables are in `public` schema with RLS enabled. Applied via `supabase/migrations/` — run manually in Supabase SQL Editor or via Management API.

| Table | Purpose | RLS |
|---|---|---|
| `profiles` | Mirrors `auth.users`, stores `business_model` | SELECT/UPDATE/DELETE own |
| `shopify_connections` | Shopify access tokens per user | Full CRUD own |
| `suppliers` | Supplier name/email/SKUs per user | Full CRUD own |
| `waitlist` | Public email signups | Anon INSERT only |

`profiles` is populated automatically via a trigger `on_auth_user_created` on `auth.users`.

### Authentication Flow

- **Email/password** — `supabase.auth.signUp()` / `signInWithPassword()`. Email confirmation is **disabled** in Supabase (Sign In / Providers → Confirm email OFF).
- **Google OAuth** — `signInWithOAuth({ provider: 'google' })` with `redirectTo: ${origin}/auth/callback`. Supabase project must have Google enabled with Client ID + Secret.
- **Password reset** — `resetPasswordForEmail()` redirects to `/auth/reset-password` which exchanges the PKCE code client-side.

### Shopify OAuth Flow

1. User submits store domain → `/api/shopify/auth` normalises domain, signs a HMAC state token (15min TTL), redirects to Shopify authorize URL
2. Shopify redirects to `/api/shopify/callback` → verifies HMAC + state token, exchanges code for access token, upserts into `shopify_connections`
3. Required env: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_OAUTH_STATE_SECRET`, `NEXT_PUBLIC_APP_URL`

### AI Engine (`/api/agent/analyze`)

`POST` — authenticated. Flow:
1. Reads `business_model` from user's `profiles` row
2. Fetches `shopify_connections` for the access token
3. Fetches `suppliers` for the user
4. Calls Shopify Admin API `GET /admin/api/2024-01/products.json`
5. Builds prompt via `buildPrompts(businessModel, ...)` — three distinct prompts for `inventory` / `dropshipping` / `hybrid`
6. Calls `claude-haiku-4-5` (cost-efficient for MVP)
7. Parses JSON response, returns `AnalysisResult`

The `buildPrompts()` function is the key customisation point. Each business model has a different system prompt and different JSON output rules (e.g. dropshipping uses `reorder_qty: 0` and action-based reasoning).

### Styling

Tailwind CSS v4. Custom design tokens defined in `app/globals.css` under `@theme inline`:

| Token | Value | Usage |
|---|---|---|
| `ss-black` | `#080808` | Page background |
| `ss-cream` | `#f4f1ea` | Primary text |
| `ss-accent` | `#ff4d1c` | Brand orange-red, CTAs |
| `ss-green` | `#00e5a0` | Success, connected states |
| `ss-surface` | `#141414` | Card backgrounds |
| `ss-muted` | `#4a4a4a` | Secondary text |

Fonts: `Syne` (sans, headings) and `DM Mono` (mono, body/labels) loaded via `next/font/google` in `layout.tsx`.

The marketing page (`/marketing`) has its own isolated CSS in `app/marketing/marketing.css` — it does not use Tailwind.

---

## Environment Variables

Required in `.env.local` (dev) and Vercel (prod):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL              # no trailing slash — used in Shopify OAuth redirects
SHOPIFY_API_KEY                  # Shopify Partner app Client ID
SHOPIFY_API_SECRET               # Shopify Partner app Client Secret
SHOPIFY_OAUTH_STATE_SECRET       # Random 32-byte hex — signs HMAC state tokens
ANTHROPIC_API_KEY                # sk-ant-...
```

Optional:
```
SHOPIFY_SCOPES                   # defaults to read_products,read_inventory,read_orders,read_locations
NEXT_PUBLIC_POSTHOG_KEY          # omit to disable analytics
NEXT_PUBLIC_POSTHOG_HOST
```

---

## Key Decisions & Context

- **`--webpack` build flag** — intentional, do not switch to Turbopack
- **Email confirmation disabled** — Supabase project has "Confirm email" OFF for smoother onboarding
- **Vercel Deployment Protection** — must be OFF (project-level Settings → Deployment Protection) otherwise Shopify/Google OAuth callbacks get intercepted
- **Supabase redirect URLs allowlist** — must include both `http://localhost:3000/**` and the Vercel production URL with `/**`
- **Google OAuth** — app must be Published (not Testing) in Google Cloud Console for public access; Authorized JavaScript Origins must include both localhost and Vercel URL
- **Model selection** — `claude-haiku-4-5` used intentionally for cost efficiency ($5 credits). Upgrading to Sonnet/Opus requires only changing the model string in `/api/agent/analyze/route.ts`
- **`business_model` column** — added to `profiles` table (migration `20260519120000_business_model.sql`), drives which AI prompt is used in analyze route
- **Supabase migrations** — applied manually via SQL Editor or Supabase Management API (`POST /v1/projects/{ref}/database/query`). All 5 migrations are already applied to production.

---

## Infrastructure

| Service | Purpose | Credentials |
|---|---|---|
| Vercel | Hosting + auto-deploy on `git push main` | Vercel API (project: `prj_v4r2D9SBYQgYgSabNvWeTXySuIzK`) |
| Supabase | Auth + PostgreSQL | Project ref: `wdwtmabolhnszwrndfst` |
| Shopify Partners | OAuth app | App: StockSense, v1.0-mvp-launch |
| Anthropic | Claude API | console.anthropic.com |
| Google Cloud | OAuth provider | Project: stocksense-496709 |
| PostHog | Analytics | Optional — omit key to disable |
