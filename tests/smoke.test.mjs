import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
const sb = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
test('preview routes render and remain excluded from search indexing', async () => {
  for (const path of ['/', '/contact']) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('x-robots-tag'), /noindex/);
    assert.match(await res.text(), /All Things Tile/);
  }
  const robots = await fetch(base + '/robots.txt');
  assert.match(await robots.text(), /Disallow: \//);
});
test('feed comes from the separate Supabase database', async () => {
  const res = await fetch(base + '/api/health');
  const health = await res.json();
  assert.equal(health.feedStorage, 'supabase');
  assert.equal(health.preview, true);
  assert.ok(health.posts > 0);
});
test('contact endpoint rejects invalid payloads and cross-origin submissions', async () => {
  const invalid = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'a', email: 'bad', message: 'short' }) });
  assert.equal(invalid.status, 400);
  const crossOrigin = await fetch(base + '/api/contact', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(crossOrigin.status, 403);
});
test('public key reads published posts but cannot read inquiries or write posts', async () => {
  assert.ok(sb && key, 'Supabase publishable configuration required');
  const posts = await fetch(`${sb}/rest/v1/posts?select=id,published&limit=1`, { headers: { apikey: key } });
  assert.equal(posts.status, 200);
  assert.ok((await posts.json()).every(p => p.published));
  const privateRead = await fetch(`${sb}/rest/v1/inquiries?select=*`, { headers: { apikey: key } });
  assert.equal(privateRead.status, 401);
  const write = await fetch(`${sb}/rest/v1/posts`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'unauthorized-test' }) });
  assert.equal(write.status, 401);
});
test('Facebook sync refuses unauthenticated calls', async () => {
  const res = await fetch(`${sb}/functions/v1/facebook-sync`, { method: 'POST', headers: { apikey: key } });
  assert.equal(res.status, 401);
});
test('honeypot form response does not claim email delivery', async () => {
  const res = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ website: 'spam.example', name: 'Test', email: 'bot@example.com', message: 'Honeypot test only' }) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).delivered, false);
});
