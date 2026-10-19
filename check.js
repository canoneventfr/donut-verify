import crypto from 'node:crypto';
import { unseal } from './send.js';

/* Step 2: hand the code the visitor typed to got-beamed and report what it says.

   The task id arriving here is the sealed envelope /api/send issued. Checking
   its signature proves we issued it and that it has not expired, without the
   function needing to remember anything between requests. */
const API_BASE = 'https://got-beamed.lol/api/v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code, taskId } = req.body;
  if (!code) return res.status(400).json({ error: 'No code' });
  if (!taskId) return res.status(400).json({ error: 'No taskId' });

  const KEY = process.env.VERIFY_KEY;
  if (!KEY) return res.status(500).json({ error: 'Server not configured' });

  const task = unseal(taskId, KEY);
  if (!task) return res.status(409).json({ ok: false, error: 'Bad or forged code — resend' });
  if (Date.now() > task.x) return res.status(409).json({ ok: false, error: 'Code expired — resend' });
  if (task.e !== email) return res.status(409).json({ ok: false, error: 'Wrong address — resend' });

  try {
    const r = await fetch(`${API_BASE}/secure/${encodeURIComponent(task.t)}/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ otp: code })
    });
    const data = await r.json();
    if (!data.success) {
      return res.json({ ok: false, error: data.error || 'Wrong code' });
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: 'API unreachable' });
  }
}
