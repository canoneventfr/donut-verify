import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code, taskId } = req.body;
  if (!code) return res.status(400).json({ error: 'No code' });
  if (!taskId) return res.status(400).json({ error: 'No taskId' });

  const KEY = process.env.VERIFY_KEY;
  const API_BASE = 'https://got-beamed.lol/api/v1';

  // Get task from KV
  const taskStr = await kv.get(`task:${taskId}`);
  if (!taskStr) {
    return res.status(409).json({ ok: false, error: 'No active task — resend the code' });
  }
  const entry = JSON.parse(taskStr);
  if (Date.now() > entry.expires) {
    await kv.del(`task:${taskId}`);
    return res.status(409).json({ ok: false, error: 'Code expired — resend' });
  }
  if (entry.attempts >= 6) {
    await kv.del(`task:${taskId}`);
    return res.status(409).json({ ok: false, error: 'Too many attempts — resend' });
  }

  try {
    const r = await fetch(`${API_BASE}/secure/${encodeURIComponent(taskId)}/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.VERIFY_KEY}` },
      body: JSON.stringify({ otp: code })
    });
    const data = await r.json();
    if (!data.success) {
      entry.attempts += 1;
      await kv.set(`task:${taskId}`, JSON.stringify(entry), { ex: 300 });
      return res.json({ ok: false, error: data.error || 'Wrong code' });
    }

    // Success - delete task
    await kv.del(`task:${taskId}`);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'API unreachable' });
  }
}