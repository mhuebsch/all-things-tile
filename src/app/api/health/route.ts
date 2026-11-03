import { getFeed } from "@/lib/feed";
export async function GET() {
  const feed = await getFeed();
  return Response.json({ status: feed.storage === "supabase" ? "ok" : "degraded", feedStorage: feed.storage, posts: feed.posts.length, facebookConnected: feed.posts.some(p => p.source === "facebook"), emailDeliveryConfigured: process.env.CONTACT_EMAIL_ENABLED === "true", preview: true });
}
