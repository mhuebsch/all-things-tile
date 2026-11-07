import { getFeed } from "@/lib/feed";
import { contactConfig } from "@/lib/contact-config";
export async function GET() {
  const feed = await getFeed();
  return Response.json({ status: feed.storage === "facebook" ? "ok" : "degraded", feedStorage: feed.storage, posts: feed.posts.length, facebookConnected: feed.storage === "facebook", emailDeliveryConfigured: Boolean(contactConfig()), preview: true });
}
