import crypto from 'node:crypto';

/* Step 1 of the code check: ask got-beamed to email a code.

   The task id handed back to the browser is not the raw one the API gave us.
   It is a signed envelope carrying that id, the address it went to, and an
   expiry, so /api/check can trust all three without keeping any server state -
   Vercel functions are stateless and there is no database behind this. */
const API_BASE = 'https://got-beamed.lol/api/v1';
const TTL_MS = 5 * 60 * 1000;

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (str) => Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function seal(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret).update(body).digest();
  return body + '.' + b64url(mac);
}

export function unseal(token, secret) {
  const dot = String(token || '').indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expect = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  const a = Buffer.from(given);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
}

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
    if (!data.success) return res.status(r.status === 401 ? 401 : 502).json({ error: data.error || 'Send failed' });

    const taskId = data.data.taskId ?? data.data.task_id ?? data.data.id;
    if (!taskId) return res.status(502).json({ error: 'No taskId in API response' });

    const taskId_sealed = seal({ t: String(taskId), e: email, x: Date.now() + TTL_MS }, KEY);
    const display = data.data.accounts?.[0]?.sentTo || data.data.display || data.data.maskedEmail || data.data.masked_email || '';
    return res.json({ ok: true, display, taskId: taskId_sealed });
  } catch (e) {
    return res.status(502).json({ error: 'API unreachable' });
  }
}
