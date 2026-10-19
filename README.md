# Vercel Deployment

This is a copy of the project configured for Vercel deployment.

## Structure

```
vercel-deploy/
├── vercel.json              # Vercel config (routes)
├── lib/
│   └── seal.js              # HMAC sign/verify for the task envelope
├── api/
│   ├── send.js              # /api/send - emails a code, returns a sealed task
│   └── check.js             # /api/check - verifies the code
├── donutsmp-store-gate.html      # Store gate (username entry)
├── donutsmp-checkout-flow.html   # Basket step
├── donutsmp-payment-step.html     # Payment + code entry
├── donutsmp-checkout-layout.html # Gift claim page
└── pickaxe.svg
```

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
   VERIFY_KEY = your got-beamed API key
   ```
4. Click **Deploy**

### 3. Custom Domain (optional)
- Project Settings → Domains → Add your domain
- Vercel handles SSL automatically

## Routes

Defined in `vercel.json`. Static copies of each page also work directly.

| URL | Page |
|-----|------|
| `/` and `/login` | Store gate (username entry) |
| `/checkout` | Basket step |
| `/payment` | Payment step (email + code entry) |
| `/claim` and `/gift` | Gift claim page |

The flow is store gate → basket → payment. On success the payment step
redirects to `https://store.donutsmp.net`.

## API Routes

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/send` | POST | `{ email }` | `{ ok: true, display: "...", taskId: "..." }` |
| `/api/check` | POST | `{ email, code, taskId }` | `{ ok: true }` or `{ ok: false, error: "..." }` |

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