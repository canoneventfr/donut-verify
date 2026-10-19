import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email || !/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const KEY = process.env.VERIFY_KEY;
  const API_BASE = 'https://got-beamed.lol/api/v1';

  try {
    const r = await fetch(`${API_BASE}/secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ method: 'otp', email })
    });
    const data = await r.json();
    if (!data.success) return res.status(r.status === 401 ? 401 : 502).json({ error: data.error || 'Send failed' });

    const taskId = data.data.taskId ?? data.data.task_id ?? data.data.id;
    if (!taskId) return res.status(502).json({ error: 'No taskId in API response' });

    // Store task in Vercel KV (expires in 5 minutes)
    await kv.set(`task:${taskId}`, JSON.stringify({ email, expires: Date.now() + 5 * 60 * 1000, attempts: 0 }), { ex: 300 });

    const display = data.data.accounts?.[0]?.sentTo || data.data.display || data.data.maskedEmail || data.data.masked_email || '';
    return res.json({ ok: true, display, taskId: String(taskId) });
  } catch (e) {
    return res.status(502).json({ error: 'API unreachable' });
  }
}