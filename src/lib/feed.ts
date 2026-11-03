import preview from "@/data/preview-posts.json";
import type { Feed, Post } from "./types";
export async function getFeed(): Promise<Feed> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/posts?select=*&published=eq.true&order=posted_on.desc,id.desc&limit=100`, {
        headers: { apikey: key }, next: { revalidate: 60 }, signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) throw new Error("Feed unavailable");
      const posts = await res.json() as Post[];
      return { posts, storage: "supabase" };
    } catch { /* Keep the dated preview available during setup or a temporary outage. */ }
  }
  return { posts: preview as Post[], storage: "local_snapshot", warning: "Showing the saved preview while the feed connection is unavailable." };
}
