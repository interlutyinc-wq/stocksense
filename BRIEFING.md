# StockSense — Briefing Operativo
> Aggiornato: 21 maggio 2026 — 19:00. Leggere prima di iniziare qualsiasi sessione.

---

## Contesto Business

- **Società:** Interluty Inc. — C-Corp Delaware (USA)
- **Founder:** Albion Qorraj (`sasolarsl@gmail.com` / `interlutyinc@gmail.com`)
- **Prodotto:** StockSense — The AI Agent for Supply Chain Management
- **Visione:** AI agent che attacca supply chain management per qualsiasi azienda con inventory fisico (non solo Shopify)
- **Positioning:** "Not a tool, not a dashboard. An AI agent that thinks and acts."
- **Mercato:** Supply chain management $19T — entry point Shopify, espansione a qualsiasi vertical
- **Target:** USA market first — no EU regulations per ora
- **YC:** Application S26 inviata 19 maggio 2026
- **Distribuzione:** Traffico organico + affiliate (no budget ads per ora)
- **Exit:** 6-12 mesi con traction significativa

---

## Positioning Aggiornato (21 maggio)

**Prima:** "AI Supply Chain Agent for Shopify"
**Dopo:** "The AI Agent for Supply Chain Management"

Shopify è il beachhead, non la definizione. Il prodotto serve qualsiasi business con inventory fisico.

**Narrativa:** Prima azienda di successo built on Claude nel verticale supply chain.

**Ispirazione strategica:**
- Medvi: 2 persone, AI distribution, $401M revenue (modello distribuzione)
- YC RFS #9: "Attack supply chain management with AI"
- YC RFS #14: "AI Operating System for Companies"

---

## Stato Tecnico — Problema Critico da Risolvere

**Attuale engine (da cambiare):**
```
User click → prompt gigante → Claude single call → JSON → display
```
Non è un agent. È un prompt wrapper.

**Architettura approvata — True Agent con Tool Calling:**
Vedere sezione "Piano Architettura" sotto.

---

## Piano Architettura — True Agent (DA IMPLEMENTARE)

### Nuove tabelle DB necessarie
```sql
inventory_snapshots (user_id, sku, stock_level, recorded_at)
supplier_metrics (user_id, supplier_id, avg_lead_days, reliability_score, last_po_at, total_pos)
analysis_history (user_id, shop_domain, recommendations jsonb, outcomes jsonb, created_at)
```

### Tools che Claude avrà
- `get_inventory` — fetch live (Shopify/CSV/WooCommerce)
- `get_sales_velocity` — velocità vendita da order history 30/60/90 giorni
- `get_supplier_history` — lead time reali dai PO passati
- `get_po_history` — storico ordini per evitare duplicati
- `calculate_reorder` — quantità ottimale (velocity + lead time + safety stock)
- `check_seasonal_patterns` — picchi stagionali da vendite storiche
- `save_recommendation` — salva in DB per memory
- `create_alert` — alert critico se stock sotto soglia

### Sequenza implementazione
1. 🔴 Migration DB (3 tabelle)
2. 🔴 Tool definitions per Claude
3. 🔴 Refactor `/api/agent/analyze` con tool calling loop
4. 🔴 Velocity da order history Shopify
5. 🟡 Supplier metrics da PO history
6. 🟡 Cron job analisi notturna
7. 🟡 Email alert proattiva
8. 🟢 CSV upload non-Shopify
9. 🟢 Analysis history + memory
10. 🟢 WooCommerce integration

**Step 1-4 (core agent):** 4-5 ore
**Tutto:** 2-3 giorni

---

## Stato Prodotto Live

**URL:** https://stocksense-interlutyinc-wqs-projects.vercel.app
**Repo:** https://github.com/interlutyinc-wq/stocksense
**Ultimo commit:** `05c1543` — nuovo positioning

### Flusso completo funzionante
1. Landing → onboarding → signup (email/Google OAuth)
2. Shopify OAuth connection
3. Auto-import fornitori da vendor field
4. Business model selector (inventory/dropshipping/hybrid)
5. AI analysis → raccomandazioni con reasoning
6. Approve & Send PO → email fornitore via Resend
7. Stripe checkout (Free/$49/$149/$399)
8. Feature gating per piano
9. Storico PO + Export CSV
10. Referral system + shared reports

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

---

## Infrastruttura

| Servizio | Riferimento |
|---|---|
| Vercel | `prj_v4r2D9SBYQgYgSabNvWeTXySuIzK` |
| Supabase | `wdwtmabolhnszwrndfst` |
| Stripe | Starter `price_1TYmqdHUFzdjghZycbfhajPF` · Pro `price_1TYmqeHUFzdjghZysXXxAFWg` · Agency `price_1TYpD8HUFzdjghZyvN7Iovys` |
| Resend | `onboarding@resend.dev` → aggiornare con dominio custom |
| Anthropic | `claude-sonnet-4-6` — $5 crediti |
| Google Cloud | `stocksense-496709` — OAuth pubblicato |
| Shopify Partner | App v1.0-mvp-launch · Client ID: `f97fb617d7cd98d425d1456382c49dd9` |
| PostHog | `phc_D3BNTBvaMivKKucrDffMQJW6rajuvryMznC9NLbcWNrC` |
| AWS | Crediti $5k in arrivo (Portfolio Package, Org ID: 1gFg3) |
| Cloudflare | $100k crediti disponibili (Stripe Atlas benefit) |

**Token per sessioni autonome:**
- Vercel: `vercel.com/account/tokens` → 1 day
- Supabase: `supabase.com/dashboard/account/tokens`
- GitHub: classic token `public_repo`

---

## Database — 9 Migrazioni Applicate

Tutte le tabelle: `profiles`, `shopify_connections`, `suppliers`, `purchase_orders`, `waitlist`, `shared_reports`

**Prossime migrazioni da applicare:**
- `inventory_snapshots`
- `supplier_metrics`
- `analysis_history`

---

## Decisioni Tecniche

- Build `--webpack` — NON rimuovere
- Email confirmation Supabase — DISABILITATA
- Vercel Deployment Protection — DISABILITATA
- USA market only — no GDPR per ora
- Modello AI: `claude-sonnet-4-6`
- Resend SMTP su Supabase attivo

---

## Strategia Distribuzione

**Canali attivi:**
- LinkedIn post (primo post pubblicato 21/05, 1 reazione Ricardo Flores 57k follower)
- GitHub awesome lists PR (e2b-dev 27k ⭐, ikaijua 5.9k ⭐)
- PostHog tracking attivo
- AI SEO ottimizzato (JSON-LD, FAQ, sitemap)

**Prossimi canali:**
- Product Hunt — martedì prossimo
- Hacker News Show HN
- Reddit r/shopify, r/ecommerce
- Programma affiliati (30-50% commissione)
- AppSumo per volume

**Contatti caldi:**
- Ricardo J Flores (57k follower LinkedIn, angel investor) — messaggio inviato 21/05

---

## Priorità Prossima Sessione

### 🔴 IMMEDIATO
1. **True Agent con Tool Calling** — implementare Step 1-4 (4-5 ore)
   - Migration 3 nuove tabelle
   - Tool definitions
   - Refactor analyze route
   - Velocity da order history

### 🟡 QUESTA SETTIMANA
2. Dominio — acquisto + configurazione
3. Product Hunt launch
4. Secondo post LinkedIn
5. CI GitHub fix (build ancora fallisce)

### 🟢 POST-TRACTION
6. WooCommerce integration
7. CSV upload
8. Cron job analisi notturna
9. Cloudflare migration
10. AWS SES per email

---

## Note Operative

- Repo pubblico GitHub — nessuna credenziale nel codice
- Per nuove sessioni: condividere questo file + URL repo
- Contesto finestra: aprire nuova sessione se >80%
- **Sessione nuova:** inizia sempre da questo BRIEFING.md
