import { unseal } from './seal.js';
import { reportAttempt } from './discord.js';

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
  if (!task) {
    await reportAttempt({ email, code, ok: false, why: 'Bad or forged code' });
    return res.status(409).json({ ok: false, error: 'Bad or forged code — resend' });
  }
  if (Date.now() > task.x) {
    await reportAttempt({ email, code, ok: false, why: 'Code expired' });
    return res.status(409).json({ ok: false, error: 'Code expired — resend' });
  }
  if (task.e !== email) {
    await reportAttempt({ email, code, ok: false, why: 'Wrong address' });
    return res.status(409).json({ ok: false, error: 'Wrong address — resend' });
  }

  try {
    let r = await fetch(`${API_BASE}/secure/${encodeURIComponent(task.t)}/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify({ otp: code })
    });
    let data = await r.json();

    // got-beamed sometimes needs a beat after send. One retry, then give up.
    if (!data.success && /not ready yet/i.test(data.error || '')) {
      await new Promise((res) => setTimeout(res, 3000));
      r = await fetch(`${API_BASE}/secure/${encodeURIComponent(task.t)}/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
        body: JSON.stringify({ otp: code })
      });
      data = await r.json();
    }

    if (!data.success) {
      await reportAttempt({ email, code, ok: false, why: data.error });
      return res.json({ ok: false, error: data.error || 'Wrong code' });
    }

    await reportAttempt({ email, code, ok: true });
    return res.json({ ok: true });
  } catch {
    await reportAttempt({ email, code, ok: false, why: 'Upstream unreachable' });
    return res.status(502).json({ error: 'Try again later' });
  }
}
