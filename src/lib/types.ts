export type Media = { src: string; alt: string; type: "image" | "video"; poster?: string };
export type Post = {
  id: string; posted_on: string; message: string; permalink: string;
  media: Media[]; reaction_count: number | null; comment_count: number | null;
  source: "preview_snapshot" | "facebook"; published: boolean; captured_at: string;
};
export type Feed = { posts: Post[]; storage: "facebook" | "local_snapshot"; warning?: string };
