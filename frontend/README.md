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

### Auth / Supabase e Next.js 16

Non usare `middleware.ts` con `@supabase/ssr`: su Vercel l’Edge bundler segnala moduli non supportati. Questo progetto usa **`proxy.ts`** (runtime Node in Next 16) e `lib/supabase/update-session.ts` per aggiornare la sessione; vedi [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy) e la guida Supabase SSR.
