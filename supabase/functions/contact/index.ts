// Public contact endpoint. Publishable key is not a secret; validation and persistent rate limits protect writes.
function secretKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) return JSON.parse(modern).default as string;
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const allowed = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const supplied = req.headers.get('apikey');
  if (!supplied || !Object.values(allowed).includes(supplied)) return json({ error: 'Invalid app key.' }, 401);
  const key = secretKey();
  const url = Deno.env.get('SUPABASE_URL')!;
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  try {
    if (Number(req.headers.get('content-length') || 0) > 15000) return json({ error: 'Message too long.' }, 413);
    const raw = await req.text();
    if (raw.length > 15000) return json({ error: 'Message too long.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid message.' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'Invalid message.' }, 400);
    if (body.website) return json({ ok: true, delivered: false });
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || message.length < 10 || message.length > 5000) return json({ error: 'Please enter a valid name, email address, and a message of at least 10 characters.' }, 400);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    // Limit both one email and the gateway source. Hashes retain no raw IP address.
    for (const [value, max] of [[`email:${email}`, 5], [`ip:${ip}`, 30]] as const) {
      const keyHash = await hash(`${key}:${value}`);
      const limit = await fetch(`${url}/rest/v1/rpc/consume_contact_limit`, { method: 'POST', headers, body: JSON.stringify({ p_key: keyHash, p_max: max }) });
      if (!limit.ok) return json({ error: 'The form is temporarily unavailable. Please try again.' }, 503);
      if (!(await limit.json())) return json({ error: 'Too many messages. Please try again in 10 minutes or call 218.591.2200.' }, 429);
    }
    const saved = await fetch(`${url}/rest/v1/inquiries`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ name, email, message, is_preview: true }) });
    if (!saved.ok) return json({ error: 'Your message could not be saved. Please try again.' }, 503);
    const [inquiry] = await saved.json();
    let delivered = false;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('CONTACT_FROM_EMAIL');
    const to = Deno.env.get('CONTACT_TO_EMAIL');
    if (resendKey && from && to && Deno.env.get('CONTACT_EMAIL_ENABLED') === 'true') {
      try {
        const emailResult = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `inquiry-${inquiry.id}` }, body: JSON.stringify({ from, to: [to], reply_to: email, subject: 'All Things Tile — website inquiry', text: `Name: ${name}\nEmail: ${email}\n\n${message}` }), signal: AbortSignal.timeout(8000) });
        delivered = emailResult.ok;
      } catch { delivered = false; }
      await fetch(`${url}/rest/v1/inquiries?id=eq.${inquiry.id}`, { method: 'PATCH', headers, body: JSON.stringify({ delivery_status: delivered ? 'sent' : 'failed' }) });
    }
    return json({ ok: true, delivered });
  } catch { return json({ error: 'The form is temporarily unavailable. Please try again.' }, 503); }
});
