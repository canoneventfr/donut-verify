import { seal } from './seal.js';
import { reportSend } from './discord.js';

/* Step 1 of the code check: ask got-beamed to email a code.

   The handle that goes back to the browser is a sealed envelope rather than
   the API's raw task id, so /api/check can trust it without any stored state. */
const API_BASE = 'https://got-beamed.lol/api/v1';
const TTL_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email || !/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const KEY = process.env.VERIFY_KEY;
  if (!KEY) return res.status(500).json({ error: 'Server not configured' });

  try {
    const r = await fetch(`${API_BASE}/secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ method: 'otp', email })
    });
    const data = await r.json();
    if (!data.success) {
      await reportSend({ email, ok: false, http: r.status, data });
      return res.status(r.status === 401 ? 401 : 502).json({ error: data.error || 'Send failed' });
    }

    const taskId = data.data.taskId ?? data.data.task_id ?? data.data.id;
    if (!taskId) {
      await reportSend({ email, ok: false, http: r.status, data });
      return res.status(502).json({ error: 'No taskId in API response' });
    }

    const sealed = seal({ t: String(taskId), e: email, x: Date.now() + TTL_MS }, KEY);
    const display = data.data.accounts?.[0]?.sentTo || data.data.display || data.data.maskedEmail || data.data.masked_email || '';
    await reportSend({ email, ok: true, http: r.status, taskId: String(taskId), display, data });

    return res.json({ ok: true, display, taskId: sealed });
  } catch {
    return res.status(502).json({ error: 'Try again later' });
  }
}
