import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
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
test('feed reports its source and displays posts', async () => {
  const res = await fetch(base + '/api/health');
  const health = await res.json();
  assert.ok(['facebook', 'local_snapshot'].includes(health.feedStorage));
  assert.equal(health.facebookConnected, health.feedStorage === 'facebook');
  assert.equal(health.preview, true);
  assert.ok(health.posts > 0);
});
test('contact endpoint rejects invalid payloads and cross-origin submissions', async () => {
  const invalid = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'a', email: 'bad', message: 'short' }) });
  assert.equal(invalid.status, 400);
  const crossOrigin = await fetch(base + '/api/contact', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(crossOrigin.status, 403);
});
test('honeypot form response does not claim email delivery', async () => {
  const res = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ website: 'spam.example', name: 'Test', email: 'bot@example.com', message: 'Honeypot test only' }) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).delivered, false);
});
