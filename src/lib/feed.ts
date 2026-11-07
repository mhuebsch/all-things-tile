import preview from "@/data/preview-posts.json";
import type { Feed, Media, Post } from "./types";

type Attachment = {
  type?: string;
  title?: string;
  media?: { image?: { src?: string }; source?: string };
  subattachments?: { data?: Attachment[] };
};

type GraphPost = {
  id: string;
  created_time: string;
  message?: string;
  permalink_url: string;
  attachments?: { data?: Attachment[] };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
};

function mediaUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.searchParams.has("access_token") ? value : undefined;
  } catch {
    return undefined;
  }
}

function getMedia(attachments: Attachment[], caption: string): Media[] {
  return attachments.flatMap((attachment): Media[] => {
    if (attachment.subattachments?.data?.length) return getMedia(attachment.subattachments.data, caption);
    const poster = mediaUrl(attachment.media?.image?.src);
    const video = attachment.type?.includes("video") ? mediaUrl(attachment.media?.source) : undefined;
    const alt = caption || attachment.title || "All Things Tile project";
    if (video) return [{ src: video, type: "video", alt, poster }];
    return poster ? [{ src: poster, type: "image", alt }] : [];
  });
}

export async function getFeed(): Promise<Feed> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const version = process.env.FACEBOOK_GRAPH_VERSION;
  if (token && pageId && /^\d+$/.test(pageId) && version && /^v\d+\.\d+$/.test(version)) {
    try {
      const url = new URL(`https://graph.facebook.com/${version}/${pageId}/published_posts`);
      url.searchParams.set("limit", "100");
      url.searchParams.set("fields", "id,message,created_time,permalink_url,attachments{type,title,media,subattachments{type,title,media}},reactions.limit(0).summary(true),comments.limit(0).summary(true)");
      const posts: Post[] = [];
      const seen = new Set<string>();
      const signal = AbortSignal.timeout(8000);
      for (let page = 0; page < 10 && posts.length < 100; page++) {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 900 },
          signal,
        });
        if (!response.ok) throw new Error("Facebook request failed");
        const batch: { data?: GraphPost[]; paging?: { next?: string; cursors?: { after?: string } } } = await response.json();
        if (!Array.isArray(batch.data)) throw new Error("Invalid Facebook response");
        for (const post of batch.data) {
          if (!post.id || !Number.isFinite(Date.parse(post.created_time)) || !mediaUrl(post.permalink_url) || seen.has(post.id)) continue;
          seen.add(post.id);
          posts.push({
            id: post.id,
            posted_on: post.created_time.slice(0, 10),
            message: post.message ?? "",
            permalink: post.permalink_url,
            media: getMedia(post.attachments?.data ?? [], post.message ?? ""),
            reaction_count: post.reactions?.summary?.total_count ?? null,
            comment_count: post.comments?.summary?.total_count ?? null,
            source: "facebook",
            published: true,
            captured_at: new Date().toISOString(),
          });
        }
        const after = batch.paging?.cursors?.after;
        if (!batch.paging?.next || !after) break;
        url.searchParams.set("after", after);
      }
      return { posts: posts.slice(0, 100), storage: "facebook" };
    } catch {
      // The bundled snapshot keeps the gallery available during setup or an outage.
    }
  }
  return { posts: preview as Post[], storage: "local_snapshot", warning: "Showing the saved preview while the Facebook connection is unavailable." };
}
