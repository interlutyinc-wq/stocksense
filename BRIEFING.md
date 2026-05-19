# StockSense — Briefing Operativo
> Aggiornato: 19 maggio 2026. Leggere prima di iniziare qualsiasi sessione di sviluppo.

---

## Contesto Business

- **Società:** Interluty Inc. — C-Corp Delaware (USA)
- **Founder:** Albion Qorraj (`sasolarsl@gmail.com`)
- **Prodotto:** StockSense — AI-native supply chain agent per merchant Shopify
- **Target:** $2M USD revenue in 6 mesi
- **Pricing live:** Starter $49/mo · Agent $149/mo · Enterprise custom
- **Angel investor caldo:** Marco Streparava (Streparava Group) — presentazione da schedulare
- **Investimento attuale:** €22 (piano Claude Pro) — full bootstrapping
- **Stack societario:** C-Corp Delaware ottimizzata per VC/acquisizione US

---

## Stato Prodotto — Live

**URL produzione:** https://stocksense-interlutyinc-wqs-projects.vercel.app  
**Repo:** https://github.com/interlutyinc-wq/stocksense (pubblico)  
**Ultimo commit:** `d6863a2` — landing aggiornata con CTA live

### Flusso utente completo funzionante
1. Landing `/marketing` → CTA → `/onboarding`
2. Signup (email/password o Google OAuth)
3. Connessione Shopify store (OAuth Partner App)
4. Auto-import fornitori da Shopify vendor field
5. Dashboard → seleziona business model → Analyze inventory
6. AI (Claude Sonnet 4.6) analizza inventory live + genera raccomandazioni
7. "Approve & Send PO" → salva in DB + invia email fornitore via Resend
8. Upgrade piano → Stripe Checkout → webhook aggiorna piano su Supabase

---

## Infrastruttura — Token e Riferimenti

| Servizio | Riferimento | Note |
|---|---|---|
| Vercel | Project ID: `prj_v4r2D9SBYQgYgSabNvWeTXySuIzK` | Auto-deploy su push main |
| Supabase | Project ref: `wdwtmabolhnszwrndfst` | 6 migrazioni applicate |
| Stripe | Account: Interluty Inc. | Starter `price_1TYmqdHUFzdjghZycbfhajPF` · Agent `price_1TYmqeHUFzdjghZysXXxAFWg` |
| Resend | Account: interlutyinc@gmail.com | Sender: `onboarding@resend.dev` → aggiornare con dominio custom |
| Anthropic | Account: interlutyinc@gmail.com | $5 crediti, modello: `claude-sonnet-4-6` |
| Google Cloud | Project: `stocksense-496709` | OAuth pubblicato, non verificato |
| Shopify Partner | App: StockSense v1.0-mvp-launch | Client ID: `f97fb617d7cd98d425d1456382c49dd9` |

**Token da richiedere per sessioni autonome:**
- Vercel: `vercel.com/account/tokens` → crea token 1 day
- Supabase: `supabase.com/dashboard/account/tokens` → crea token
- Stripe: già configurato, usare secret key da Vercel env

---

## Decisioni Tecniche Chiave

- **Build flag `--webpack`** — NON rimuovere, intentional
- **Email confirmation Supabase** — DISABILITATA (Sign In / Providers)
- **Vercel Deployment Protection** — DISABILITATA (project settings)
- **Google OAuth** — deve restare in stato "Published" (non Testing)
- **Supabase redirect URLs** — include `http://localhost:3000/**` e `https://stocksense-interlutyinc-wqs-projects.vercel.app/**`
- **Modello AI** — `claude-sonnet-4-6` in `frontend/app/api/agent/analyze/route.ts`
- **Resend SMTP Supabase** — configurato via Management API, host `smtp.resend.com:465`
- **Stripe Customer Portal** — configurato con ID `bpc_1TYoBoHUFzdjghZyyjtglrDs`

---

## Database — 6 Migrazioni Applicate

| File | Contenuto |
|---|---|
| `20260512140000_onboarding.sql` | `shopify_connections` + `suppliers` + RLS |
| `20260515120000_waitlist.sql` | `waitlist` + anon insert policy |
| `20260517120000_profiles.sql` | `profiles` + trigger `on_auth_user_created` |
| `20260517130000_cleanup.sql` | Drop tabelle orfane + policy delete profiles |
| `20260519120000_business_model.sql` | Colonna `business_model` su profiles |
| `20260519130000_purchase_orders.sql` | `purchase_orders` + RLS CRUD |
| `20260519140000_stripe.sql` | Colonne `plan`, `stripe_customer_id`, `stripe_subscription_id` su profiles |

---

## Priorità Immediate — Prossima Sessione

### 🔴 Bloccanti per primi clienti paganti
1. **Dominio** — acquistare (opzioni: `stocksense.app` ~€14/anno su Cloudflare)
   - Sblocca: email sender custom (`noreply@stocksense.app`), credibilità, Supabase auth domain
2. **Aggiornare CLAUDE.md** — riflettere tutto il lavoro del 19 maggio

### 🟡 Alta priorità (questa settimana)
3. **Storico PO in dashboard** — lista purchase orders inviati con stato
4. **Google OAuth verification** — processo Google (1-7 giorni), rimuove warning "app non verificata"
5. **Outreach 3-5 merchant** — contatto diretto per beta test

### 🟢 Post-lancio
6. Notifiche email automatiche (alert stock critico schedulato)
7. Multi-store Shopify
8. Amazon/WooCommerce integration
9. Shopify App Store listing

---

## Roadmap Strategica

### Questa settimana (19-25 maggio)
- [ ] Acquisto dominio
- [ ] Primi 3-5 merchant reali
- [ ] Video demo 60 secondi
- [ ] Primo cliente pagante

### Prossimo mese
- [ ] 20 clienti paganti (~$1k MRR)
- [ ] Presentazione Marco Streparava
- [ ] Decisione: bootstrap vs seed round

### 6 mesi
- Target: $2M ARR
- Verticale da dominare: dropshipping EU o fashion
- Potenziali acquirenti: Shopify, Faire, Linnworks, Brightpearl

---

## Business Model — Differenziatori Reali

Non il codice (replicabile). Il vero moat:
1. **Dati aggregati** — decisioni PO di molti merchant = insight unici
2. **Profondità integrazione** — da "raccomanda" a "fa" (PO → tracking → riconciliazione)
3. **Rete fornitori** — partnership Widrop/altri = distribution channel
4. **Specializzazione verticale** — essere il leader di un niche specifico

---

## Note Operative

- Il repo è **pubblico** su GitHub — nessuna credenziale hardcoded nel codice
- Tutte le chiavi sono su Vercel (env vars) e mai nel codice
- Per nuove sessioni Claude: condividere questo file + CLAUDE.md + URL repo
- Supabase Management API: `POST /v1/projects/wdwtmabolhnszwrndfst/database/query` con bearer token
