// Requires a Page access token and explicit API version confirmed for the owner's Meta app.
// Not scheduled until the actual Page connection is authorized and tested.
function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
function serviceKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  return modern ? JSON.parse(modern).default as string : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
type Attachment = { type?: string; media?: { image?: { src?: string }; source?: string }; subattachments?: { data?: Attachment[] }; title?: string };
function mediaFor(items: Attachment[], caption: string): { src: string; type: string; alt: string; poster?: string }[] {
  return items.flatMap(item => {
    if (item.subattachments?.data?.length) return mediaFor(item.subattachments.data, caption);
    const poster = item.media?.image?.src;
    const video = item.type?.includes('video') && item.media?.source;
    const src = video || poster;
    if (!src || !src.startsWith('https://')) return [];
    return [{ src, type: video ? 'video' : 'image', alt: caption || item.title || 'All Things Tile project', ...(video && poster ? { poster } : {}) }];
  });
}
Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const syncSecret = Deno.env.get('FACEBOOK_SYNC_SECRET');
  if (!syncSecret || req.headers.get('Authorization') !== `Bearer ${syncSecret}`) return json({ error: 'Unauthorized.' }, 401);
  const token = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  const version = Deno.env.get('FACEBOOK_GRAPH_VERSION');
  if (!token || !pageId || !version || !/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(pageId)) return json({ error: 'Facebook Page access is not configured.' }, 503);
  const key = serviceKey();
  const url = Deno.env.get('SUPABASE_URL')!;
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  const status = (value: unknown) => fetch(`${url}/rest/v1/feed_sync_status?id=eq.true`, { method: 'PATCH', headers, body: JSON.stringify(value) });
  await status({ last_attempt_at: new Date().toISOString(), status: 'running' });
  try {
    const fields = 'id,message,created_time,permalink_url,attachments{type,title,media,subattachments{type,title,media}},reactions.limit(0).summary(true),comments.limit(0).summary(true)';
    let after: string | undefined;
    let complete = false;
    const posts = [];
    // Retain a bounded current feed; fail without altering data if the scope exceeds 1000 posts.
    for (let page = 0; page < 10; page++) {
      const target = new URL(`https://graph.facebook.com/${version}/${pageId}/published_posts`);
      target.searchParams.set('fields', fields); target.searchParams.set('limit', '100');
      if (after) target.searchParams.set('after', after);
      const result = await fetch(target, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
      if (!result.ok) throw new Error('Facebook request failed');
      const batch = await result.json();
      if (!Array.isArray(batch.data)) throw new Error('Invalid feed');
      for (const post of batch.data) {
        if (!post.id || !post.created_time || !post.permalink_url?.startsWith('https://www.facebook.com/')) throw new Error('Missing post fields');
        posts.push({ id: post.id.split('_').pop(), posted_on: post.created_time.slice(0, 10), message: post.message || '', permalink: post.permalink_url, media: mediaFor(post.attachments?.data || [], post.message || ''), reaction_count: post.reactions?.summary?.total_count ?? null, comment_count: post.comments?.summary?.total_count ?? null, source: 'facebook', published: true, captured_at: new Date().toISOString() });
      }
      if (!batch.paging?.next) { complete = true; break; }
      after = batch.paging?.cursors?.after;
      if (!after) throw new Error('Missing cursor');
    }
    if (!complete) throw new Error('History exceeds preview import limit');
    // Transactionally replace the public cache only after the complete fetch succeeds.
    const saved = await fetch(`${url}/rest/v1/rpc/replace_facebook_posts`, { method: 'POST', headers, body: JSON.stringify({ p_posts: posts }) });
    if (!saved.ok) throw new Error('Could not save posts');
    await status({ last_success_at: new Date().toISOString(), status: 'success', post_count: posts.length });
    return json({ ok: true, posts: posts.length });
  } catch {
    await status({ status: 'failed' });
    return json({ error: 'Facebook sync failed. The previous cache has been retained. Check Page permissions, token, API version, and history size.' }, 502);
  }
});
