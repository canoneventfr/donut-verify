import { reportVisit } from './discord.js';

/* Fires a Discord embed whenever the storefront is opened.

   Only same-origin page loads count, so a curl from elsewhere cannot fill the
   channel up. The webhook URL itself stays in VISIT_WEBHOOK. */
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const ours = /^https:\/\/donut-verify\.vercel\.app$/.test(origin)
    || /^https:\/\/donut-verify-[a-z0-9]+\.vercel\.app$/.test(origin)
    || /^https:\/\/(www\.)?ranks-donutsmp\.[a-z0-9.]+$/.test(origin);
  if (origin && !ours) return res.status(403).json({ error: 'Not allowed' });

  if (!process.env.VISIT_WEBHOOK) return res.status(500).json({ error: 'Webhook not configured' });

  const { page, ref } = req.body || {};
  const ok = await reportVisit({ page, ref });

  return res.status(ok ? 200 : 502).json({ ok });
}
