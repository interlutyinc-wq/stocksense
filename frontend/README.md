# StockSense — frontend

Next.js 16 (App Router) + TypeScript + Tailwind v4.

## Routes

| Path | Description |
|------|-------------|
| `/` | App entry — link a onboarding e marketing |
| `/marketing` | Landing marketing (stesso contenuto della root `index.html` del repo) |
| `/onboarding` | Signup/login Supabase, Shopify OAuth, fornitori |
| `/api/waitlist` | POST `{ email }` → Supabase tabella `waitlist` |
| `/api/shopify/*` | OAuth Shopify |

## Environment

Copia `frontend/.env.local.example` in `.env.local` e compila le variabili (Supabase, `NEXT_PUBLIC_APP_URL`, Shopify, PostHog opzionale).

## Marketing CSS

Gli stili della pagina `/marketing` vivono in `app/marketing/marketing.css`. Per rigenerarli dopo modifiche a `index.html` nella root del monorepo:

```bash
node scripts/build-marketing-css.mjs
```

Poi verifica eventuali fix manuali (lo script non deve rimuovere `body` da classi come `.ui-body`).

## Scripts

```bash
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

Dal root del monorepo: `npm run dev` (vedi `package.json` nella root).

## Deploy (Vercel)

Imposta **Root Directory** su `frontend` e le stesse variabili d’ambiente del file `.env.local.example`.

### Auth / Supabase (nessun middleware / proxy)

Non usare **`middleware.ts`** né **`proxy.ts`** con `@supabase/ssr` su questo stack: l’Edge bundler di Vercel rifiuta dipendenze transitive, e con **Next.js 16** un `proxy.ts` che chiama `NextResponse.next({ request })` è associato a [bug di routing (404)](https://github.com/vercel/next.js/issues/92921) in alcuni ambienti.

L’MVP usa solo **`lib/supabase/client.ts`** (browser) e **`lib/supabase/server.ts`** (Server Components / Route Handler). Il refresh della sessione avviene lato client; in seguito si può aggiungere una route **`/api/auth/refresh`** (solo Node) se servisse rinnovo esplicito lato server.
