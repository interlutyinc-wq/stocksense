# StockSense — Briefing Operativo
> Aggiornato: 22 maggio 2026. Leggere PRIMA di iniziare qualsiasi sessione.

---

## Contesto Business

- **Società:** Interluty Inc. — C-Corp Delaware (USA)
- **Founder:** Albion Qorraj (`sasolarsl@gmail.com` / `interlutyinc@gmail.com`)
- **Prodotto:** StockSense — The AI Agent for Supply Chain Management
- **Visione:** AI agent che attacca supply chain management per qualsiasi azienda con inventory fisico
- **Positioning:** "Not a tool, not a dashboard. An agent that reasons, decides, and acts."
- **Mercato:** Supply chain management $19T — entry point Shopify, espansione a qualsiasi vertical
- **Target:** USA market first — no GDPR/EU per ora
- **YC:** Application S26 inviata 19 maggio 2026
- **Angel investor caldo:** Marco Streparava (Streparava Group)
- **Exit target:** 6-12 mesi con traction significativa

---

## Stato Prodotto — Live

**URL:** https://stocksense-interlutyinc-wqs-projects.vercel.app
**Repo:** https://github.com/interlutyinc-wq/stocksense (pubblico)
**Ultimo commit:** `2e6738d` — database indexes audit

### Flusso completo funzionante
1. Landing → onboarding → signup (email/Google OAuth)
2. Shopify OAuth (Partner App v1.0-mvp-launch)
3. Auto-import fornitori da Shopify vendor field
4. Business model selector (inventory/dropshipping/hybrid)
5. **True Agent con streaming SSE** — reasoning in tempo reale, tool calling
6. Raccomandazioni con daily_velocity, days_remaining, urgency, estimated_cost
7. Approve & Send PO → email fornitore via Resend
8. Stripe checkout (Free/$49/$149/$399) con idempotency keys
9. Cron job 6:00 UTC → alert email SKU critici
10. Storico PO + Export CSV + Report condivisibili
11. Referral system `/r/[code]`

---

## Stack Librerie — Production-Grade

```
lib/
├── validation.ts      Zod schemas + parseBody() — tutti gli input validati
├── rate-limit.ts      Sliding window rate limiter (5 preset configs)
├── logger.ts          Structured JSON logger + Sentry integration
├── retry.ts           Exponential backoff + jitter + classifiers per servizio
├── idempotency.ts     SHA-256 keys per Stripe e PO (previene duplicati)
├── cache.ts           LRU Cache 90s Shopify inventory + vendor
├── circuit-breaker.ts Circuit Breaker Shopify/Anthropic (3 stati)
├── env.ts             Fail-fast env validation con Zod
├── plans.ts           Feature gates centralizzati
├── stripe.ts          Stripe client + PLANS
└── email.ts           Resend HTML templates PO
```

### Pattern implementati
- **Retry**: exponential backoff con full jitter, per Shopify e Resend
- **Circuit Breaker**: CLOSED→OPEN→HALF_OPEN, Shopify (5 failures/30s) e Anthropic (3 failures/60s)
- **Idempotency**: Stripe checkout (daily), PO send (hourly), webhook processing
- **Rate limiting**: 5 req/min analyze, 20 req/min PO, 10 req/5min checkout
- **Cache**: LRU 90s inventory, 5min vendors
- **Validation**: Zod su tutti gli input API con field-level error path
- **Logging**: JSON strutturato con timing, user_id, route context
- **Security**: CSP + HSTS + X-Frame-Options + Permissions-Policy

---

## Agent Engine — True Agent con Tool Calling

**Route:** `POST /api/agent/stream` (SSE streaming)

**Tools disponibili:**
- `get_inventory` — fetch live Shopify
- `get_sales_velocity` — ordini reali 30/60/90 giorni
- `get_supplier_history` — PO passati e lead time reali
- `get_supplier_list` — mapping SKU → fornitore
- `save_analysis` — memoria per sessioni future

**Pattern:** Agent loop fino a 10 iterazioni, tool calling, streaming SSE con eventi tipizzati (`agent:start`, `agent:tool_call`, `agent:tool_result`, `agent:thinking`, `agent:complete`, `agent:error`)

**Cron:** `/api/cron/alerts` — ogni mattina 6:00 UTC, check inventory leggero + email alert SKU ≤5 unità

---

## Infrastruttura — Token e Riferimenti

| Servizio | Riferimento |
|---|---|
| Vercel | Project: `prj_v4r2D9SBYQgYgSabNvWeTXySuIzK` |
| Supabase | Ref: `wdwtmabolhnszwrndfst` |
| Stripe | Starter: `price_1TYmqdHUFzdjghZycbfhajPF` · Pro: `price_1TYmqeHUFzdjghZysXXxAFWg` · Agency: `price_1TYpD8HUFzdjghZyvN7Iovys` |
| Resend | `onboarding@resend.dev` → aggiornare con dominio |
| Anthropic | `claude-sonnet-4-6` — $5 crediti |
| Google Cloud | `stocksense-496709` — OAuth pubblicato |
| Shopify Partner | App v1.0-mvp-launch · Client ID: `f97fb617d7cd98d425d1456382c49dd9` |
| PostHog | `phc_D3BNTBvaMivKKucrDffMQJW6rajuvryMznC9NLbcWNrC` |
| Sentry | Org: `interluty-inc` · Project: `stocksense` |
| AWS | Crediti $5k in arrivo (Portfolio Package, Org ID: 1gFg3) |
| Cloudflare | $100k crediti (Stripe Atlas benefit) |

**Token per sessioni autonome:**
- Vercel: `vercel.com/account/tokens` → 1 day
- Supabase: `supabase.com/dashboard/account/tokens`
- Sentry: token su `sentry.io/settings/account/api/auth-tokens/`

---

## Database — 11 Migrazioni Applicate

| File | Contenuto |
|---|---|
| `20260512140000_onboarding.sql` | shopify_connections + suppliers + RLS |
| `20260515120000_waitlist.sql` | waitlist |
| `20260517120000_profiles.sql` | profiles + trigger on_auth_user_created |
| `20260517130000_cleanup.sql` | Drop tabelle orfane |
| `20260519120000_business_model.sql` | business_model su profiles |
| `20260519130000_purchase_orders.sql` | purchase_orders + RLS |
| `20260519140000_stripe.sql` | plan, stripe_customer_id, stripe_subscription_id |
| `20260519150000_plans_v2.sql` | constraint piani + analyses tracking |
| `20260519160000_supplier_limit.sql` | Trigger enforce_supplier_limit |
| `20260519170000_viral.sql` | shared_reports + referral_code + supplier_metrics |
| `20260521120000_agent_memory.sql` | inventory_snapshots + supplier_metrics + analysis_history |
| `20260522120000_indexes.sql` | 7 indici mancanti su purchase_orders, supplier_metrics, shared_reports |

**Tabella aggiuntiva (applicata via API, non migration):**
- `processed_webhooks` — idempotency store Stripe webhooks

---

## Piani e Feature Gates

| Feature | Free | Starter $49 | Pro $149 | Agency $399 |
|---|---|---|---|---|
| SKU analizzati | 10 | 50 | ∞ | ∞ |
| Analisi/mese | 1 | ∞ | ∞ | ∞ |
| Invio PO | ❌ | ✅ | ✅ | ✅ |
| Auto-import fornitori | ❌ | ✅ | ✅ | ✅ |
| Max fornitori | 1 | 10 | ∞ | ∞ |
| Export CSV | ❌ | ❌ | ✅ | ✅ |
| Store | 1 | 1 | 1 | 5 |
| Utenti | 1 | 1 | 3 | 10 |
| PO history | 0gg | 30gg | 90gg | ∞ |

---

## Priorità Prossima Sessione

### 🔴 IMMEDIATO (distribuzione)
1. **Dominio** — acquisto + DNS Cloudflare + email custom
2. **Product Hunt launch** — martedì o mercoledì mattina
3. **10 messaggi diretti** merchant Shopify USA

### 🟡 TECNICO RESIDUO
4. **Graceful degradation** — se agent fallisce, mostra ultima analisi da `analysis_history`
5. **WooCommerce / CSV import** — multi-source inventory
6. **Shopify App Store submission** — dopo dominio

### 🟢 STRATEGIA
7. **Partnership Spocket/AutoDS** — email outreach B2B
8. **Programma affiliati attivo** — trovare i primi affiliati
9. **Demo video pubblico** — quello YC adattato per LinkedIn/Twitter

---

## Decisioni Tecniche Chiave

- Build flag `--webpack` — NON rimuovere
- Email confirmation Supabase — DISABILITATA
- Vercel Deployment Protection — DISABILITATA
- USA market only — no GDPR per ora
- TypeScript strict mode ABILITATO — `noUncheckedIndexedAccess` incluso
- Modello AI: `claude-sonnet-4-6`
- CRON_SECRET: `njWAUuZaNOfrv4IkDzpsVoJGCXLBmlTy`

---

## Note Operative

- Per nuove sessioni: condividere questo file + URL repo
- Contesto finestra: aprire nuova sessione se >80%
- Il repo è PUBBLICO — nessuna credenziale nel codice
- Sentry DSN è `NEXT_PUBLIC_` quindi pubblica — normale per client-side error tracking
