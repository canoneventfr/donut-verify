import crypto from 'node:crypto';

/* Vercel functions are stateless, so there is nowhere to keep the task that
   /api/send started. Instead the task id the browser holds is a sealed
   envelope: the real id, the address it was sent to, and when it expires,
   signed with the API key. /api/check verifies the signature and the clock
   before it accepts anything, which is as much as a stored row would buy.

   These live at the project root rather than api/ because GitHub's web
   uploader cannot write into subfolders. vercel.json wires them to /api/*
   through the builds/routes pair. */

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (str) =>
  Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function seal(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret).update(body).digest();
  return body + '.' + b64url(mac);
}

export function unseal(token, secret) {
  const text = String(token || '');
  const dot = text.indexOf('.');
  if (dot < 1) return null;

  const body = text.slice(0, dot);
  const given = text.slice(dot + 1);
  const expect = b64url(crypto.createHmac('sha256', secret).update(body).digest());

  // Constant-time compare, but only once the lengths agree - timingSafeEqual
  // throws on a mismatch, which would turn a bad token into a 500.
  const a = Buffer.from(given);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
}
