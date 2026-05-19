# StockSense — Briefing Operativo
> Aggiornato: 19 maggio 2026 — 22:30. Leggere prima di iniziare qualsiasi sessione.

---

## Contesto Business

- **Società:** Interluty Inc. — C-Corp Delaware (USA)
- **Founder:** Albion Qorraj (`sasolarsl@gmail.com` / `interlutyinc@gmail.com`)
- **Prodotto:** StockSense — AI-native supply chain agent per merchant Shopify e qualsiasi azienda con inventory fisico
- **Visione:** AI agent applicabile a ogni azienda che gestisce prodotti fisici (online e fisica)
- **Target:** 700 utenti paganti in 6 mesi, exit-ready
- **Pricing live:** Free / Starter $49 / Pro $149 / Agency $399
- **Angel investor caldo:** Marco Streparava (Streparava Group)
- **YC:** Application S26 inviata il 19 maggio 2026
- **Investimento attuale:** €22 (piano Claude Pro) — full bootstrapping

---

## Stato Prodotto — Live

**URL produzione:** https://stocksense-interlutyinc-wqs-projects.vercel.app  
**Repo:** https://github.com/interlutyinc-wq/stocksense (pubblico)  
**Ultimo commit:** `b06406a` — AI SEO optimization

### Flusso utente completo funzionante
1. Landing `/marketing` → CTA → `/onboarding`
2. Signup (email/password o Google OAuth)
3. Connessione Shopify store (OAuth Partner App v1.0-mvp-launch)
4. Auto-import fornitori da Shopify vendor field
5. Selezione business model (inventory/dropshipping/hybrid)
6. Dashboard → Analyze inventory
7. Claude Sonnet 4.6 analizza inventory live + genera raccomandazioni con reasoning
8. "Approve & Send PO" → salva in DB + invia email fornitore via Resend
9. Upgrade piano → Stripe Checkout → webhook aggiorna piano su Supabase
10. Storico PO in dashboard + Export CSV (Pro/Agency)

---

## Piani e Feature Gates

| Feature | Free | Starter $49 | Pro $149 | Agency $399 |
|---|---|---|---|---|
| SKU analizzati | 10 | 50 | ∞ | ∞ |
| Analisi/mese | 1 | ∞ | ∞ | ∞ |
| Invio PO | ❌ | ✅ | ✅ | ✅ |
| Auto-import fornitori | ❌ | ✅ | ✅ | ✅ |
| Max fornitori | 1 | 10 | ∞ | ∞ |
| Business model | Solo inventory | Tutti | Tutti | Tutti |
| Storico PO | ❌ | ✅ | ✅ | ✅ |
| Export CSV | ❌ | ❌ | ✅ | ✅ |
| Store | 1 | 1 | 1 | 5 |
| Utenti | 1 | 1 | 3 | 10 |

Gates implementati: SKU limit, PO gate, auto-import gate, supplier limit (DB trigger), analyses/month, export gate.

---

## Infrastruttura — Token e Riferimenti

| Servizio | Riferimento | Note |
|---|---|---|
| Vercel | Project ID: `prj_v4r2D9SBYQgYgSabNvWeTXySuIzK` | Auto-deploy su push main |
| Supabase | Project ref: `wdwtmabolhnszwrndfst` | 8 migrazioni applicate |
| Stripe | Account: Interluty Inc. | Starter `price_1TYmqdHUFzdjghZycbfhajPF` · Pro `price_1TYmqeHUFzdjghZysXXxAFWg` · Agency `price_1TYpD8HUFzdjghZyvN7Iovys` |
| Resend | Account: interlutyinc@gmail.com | Sender: `onboarding@resend.dev` → aggiornare con dominio custom |
| Anthropic | Account: interlutyinc@gmail.com | $5 crediti, modello: `claude-sonnet-4-6` |
| Google Cloud | Project: `stocksense-496709` | OAuth pubblicato, non verificato |
| Shopify Partner | App: StockSense v1.0-mvp-launch | Client ID: `f97fb617d7cd98d425d1456382c49dd9` |

**Token per sessioni autonome:**
- Vercel: `vercel.com/account/tokens` → crea token 1 day
- Supabase: `supabase.com/dashboard/account/tokens` → crea token
- GitHub: `github.com/settings/tokens` → classic, `public_repo`
- Stripe: secret key da Vercel env

---

## Database — 8 Migrazioni Applicate

| File | Contenuto |
|---|---|
| `20260512140000_onboarding.sql` | `shopify_connections` + `suppliers` + RLS |
| `20260515120000_waitlist.sql` | `waitlist` + anon insert policy |
| `20260517120000_profiles.sql` | `profiles` + trigger `on_auth_user_created` |
| `20260517130000_cleanup.sql` | Drop tabelle orfane + policy delete profiles |
| `20260519120000_business_model.sql` | Colonna `business_model` su profiles |
| `20260519130000_purchase_orders.sql` | `purchase_orders` + RLS CRUD |
| `20260519140000_stripe.sql` | Colonne `plan`, `stripe_customer_id`, `stripe_subscription_id` su profiles |
| `20260519150000_plans_v2.sql` | Constraint piani aggiornato + colonne `analyses_count_month`, `analyses_reset_at` |

Trigger attivo: `enforce_supplier_limit` su `public.suppliers`.

---

## Decisioni Tecniche Chiave

- **Build flag `--webpack`** — NON rimuovere
- **Email confirmation Supabase** — DISABILITATA
- **Vercel Deployment Protection** — DISABILITATA (project-level)
- **Google OAuth** — stato "Published" (non Testing)
- **Modello AI** — `claude-sonnet-4-6` in `frontend/app/api/agent/analyze/route.ts`
- **Resend SMTP** — configurato su Supabase, host `smtp.resend.com:465`
- **Stripe Customer Portal** — ID `bpc_1TYoBoHUFzdjghZyyjtglrDs`
- **Feature gates** — centralizzati in `frontend/lib/plans.ts`
- **Supplier limit** — enforced via DB trigger `check_supplier_limit()`

---

## AI Search Optimization — Fatto il 19/05

- JSON-LD `SoftwareApplication` + `FAQPage` su `/marketing`
- Meta tags, keywords, OpenGraph, Twitter card su `layout.tsx`
- `sitemap.xml` e `robots.txt` generati automaticamente
- README GitHub ottimizzato con comparisons, features, pricing
- PR aperte su GitHub awesome lists:
  - `e2b-dev/awesome-ai-agents` (27.9k ⭐) → PR #983
  - `ikaijua/Awesome-AITools` (5.9k ⭐) → PR #558

---

## Priorità Prossima Sessione

### 🔴 Questa settimana
1. **Primi clienti paganti** — outreach diretto merchant Shopify USA
2. **Product Hunt launch** — da fare il founder (richiede login)
3. **Dominio** — sblocca email custom + credibilità

### 🟡 Alta priorità
4. **Partnership Spocket/AutoDS** — supplier dropshipping USA con migliaia di merchant
5. **Programma affiliati** — 30% primo anno per chi porta clienti
6. **LinkedIn** — aggiornare headline e about (Albion deve farlo)
7. **Google OAuth verification** — rimuove warning "app non verificata"

### 🟢 Post-lancio
8. Notifiche email automatiche (alert stock critico schedulato)
9. Multi-store Shopify
10. Amazon/WooCommerce integration
11. Shopify App Store listing

---

## Strategia Crescita — Canali Prioritari

Per mercato USA (C-Corp Delaware, visione globale):
1. **Spocket/AutoDS partnership** — supplier USA con 500k+ merchant
2. **Community USA** — Reddit r/dropship, r/shopify, Facebook groups
3. **Cold outreach** — 100 merchant Shopify USA con 50-500 prodotti
4. **Creator dropshipping USA** — YouTube/TikTok, deal affiliazione
5. **Shopify App Store** — listing gratuito, review 2-4 settimane
6. **Piano Agency $399** — agenzie che gestiscono multi-store

---

## Roadmap Strategica

```
Questa settimana (19-25 maggio):
→ Primi clienti paganti
→ Product Hunt launch
→ Outreach Spocket/AutoDS

Prossimo mese:
→ 20 clienti paganti (~$2k MRR)
→ Presentazione Marco Streparava
→ Dominio acquistato

3 mesi:
→ 200 clienti ($20k MRR)
→ Risposta YC
→ Shopify App Store live

6 mesi:
→ 700 clienti ($70k MRR)
→ Exit-ready per acquirenti strategici
→ Canali: Shopify, Faire, Linnworks, Brightpearl
```

---

## Note Operative

- Repo è **pubblico** su GitHub — nessuna credenziale nel codice
- Tutte le chiavi su Vercel env vars
- Per nuove sessioni Claude: condividere questo file + CLAUDE.md + URL repo
- Supabase Management API: `POST /v1/projects/wdwtmabolhnszwrndfst/database/query`
- **Contesto finestra:** aprire nuova sessione se >70% — usare BRIEFING.md per continuità
