"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Search, Share2, ThumbsUp, X, ExternalLink } from "lucide-react";
import type { Feed, Post } from "@/lib/types";
import { FacebookIcon } from "./site-header";

const pageUrl = "https://www.facebook.com/allthingstile/";
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}
function Counts({ post }: { post: Post }) {
  return <div className="engagement">
    {post.reaction_count !== null && <span aria-label={`${post.reaction_count} reactions`}><ThumbsUp size={18} />{post.reaction_count}</span>}
    {!!post.comment_count && <span aria-label={`${post.comment_count} comments`}><MessageCircle size={18} />{post.comment_count}</span>}
  </div>;
}
function ShareButton({ post }: { post: Post }) {
  return <a className="share-post" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.permalink)}`} target="_blank" rel="noreferrer" aria-label="Share post"><Share2 size={18} /></a>;
}
function PostCard({ post, onOpen }: { post: Post; onOpen: (image: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visibleMedia = post.media.slice(0, 4);
  return <article className="post-card">
    <header className="post-header"><div><a href={pageUrl} target="_blank" rel="noreferrer">ALL THINGS TILE</a><time dateTime={post.posted_on}>{dateLabel(post.posted_on)}</time></div><a href={post.permalink} target="_blank" rel="noreferrer" aria-label="View post on Facebook"><FacebookIcon /></a></header>
    {post.message && <div className="post-copy"><p>{expanded || post.message.length <= 240 ? post.message : `${post.message.slice(0, 240)}…`}</p>{post.message.length > 240 && <button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? "See less" : "See more"}</button>}</div>}
    {visibleMedia.length > 0 && <div className={`post-media media-${visibleMedia.length}`}>
      {visibleMedia.map((media, i) => <button key={`${media.src}-${i}`} onClick={() => onOpen(i)} aria-label={`Open ${post.message || "project"}, photo ${i + 1} of ${post.media.length}`}>
        <img src={media.poster || media.src} alt={media.alt} loading="lazy" />
        {media.type === "video" && <span className="video-play">▶</span>}
        {i === 3 && post.media.length > 4 && <span className="more-images">+{post.media.length - 4}</span>}
      </button>)}
    </div>}
    {!post.media.length && <button className="unavailable-media" onClick={() => onOpen(0)}>View post <ExternalLink size={16} /></button>}
    <footer className="post-footer"><Counts post={post} /><ShareButton post={post} /></footer>
  </article>;
}
function PostViewer({ posts, initialPost, initialImage, onClose }: { posts: Post[]; initialPost: number; initialImage: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [postIndex, setPostIndex] = useState(initialPost);
  const [imageIndex, setImageIndex] = useState(initialImage);
  const post = posts[postIndex];
  const media = post.media[imageIndex];
  function changePost(delta: number) { setPostIndex(i => (i + delta + posts.length) % posts.length); setImageIndex(0); }
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; element?.close(); };
  }, []);
  return <dialog ref={dialog} className="post-dialog" aria-label="All Things Tile photo gallery" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={e => {
    if (e.key === "ArrowRight" && imageIndex < post.media.length - 1) setImageIndex(i => i + 1);
    if (e.key === "ArrowLeft" && imageIndex > 0) setImageIndex(i => i - 1);
  }}>
    <button className="close-dialog" onClick={onClose} aria-label="Close post" autoFocus><X /></button>
    <div className="viewer-layout"><div className="viewer-image">
      {media ? media.type === "video" ? <video key={media.src} src={media.src} poster={media.poster} controls /> : <img key={media.src} src={media.src} alt={media.alt} /> : <p>This photo was unavailable in the preview snapshot.<br /><a href={post.permalink} target="_blank" rel="noreferrer">View the original post on Facebook</a></p>}
      {post.media.length > 1 && <><button className="image-prev" aria-label="Previous image" disabled={imageIndex === 0} onClick={() => setImageIndex(i => i - 1)}><ChevronLeft /></button><button className="image-next" aria-label="Next image" disabled={imageIndex === post.media.length - 1} onClick={() => setImageIndex(i => i + 1)}><ChevronRight /></button><div className="image-dots">{post.media.map((m, i) => <button key={m.src} aria-label={`Show image ${i + 1} of ${post.media.length}`} aria-current={i === imageIndex ? "true" : undefined} onClick={() => setImageIndex(i)} />)}</div><span className="image-counter">{imageIndex + 1} / {post.media.length}</span></>}
    </div><div className="viewer-details"><header className="post-header"><div><a href={pageUrl} target="_blank" rel="noreferrer">ALL THINGS TILE</a><time dateTime={post.posted_on}>{dateLabel(post.posted_on)}</time></div></header><p>{post.message}</p><Counts post={post} /><div className="viewer-links"><a href={post.permalink} target="_blank" rel="noreferrer">View On Facebook</a><ShareButton post={post} /></div><div className="post-navigation"><button aria-label="Previous post" onClick={() => changePost(-1)}><ChevronLeft /> Previous post</button><button aria-label="Next post" onClick={() => changePost(1)}>Next post <ChevronRight /></button></div></div></div>
  </dialog>;
}
function subscribeColumns(callback: () => void) {
  const queries = [window.matchMedia('(max-width: 600px)'), window.matchMedia('(max-width: 1100px)')];
  queries.forEach(q => q.addEventListener('change', callback));
  return () => queries.forEach(q => q.removeEventListener('change', callback));
}
function columnCount() { return window.matchMedia('(max-width: 600px)').matches ? 1 : window.matchMedia('(max-width: 1100px)').matches ? 2 : 3; }
export function FacebookFeed({ feed }: { feed: Feed }) {
  const columns = useSyncExternalStore(subscribeColumns, columnCount, () => 3);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);
  const [viewer, setViewer] = useState<{ post: number; image: number } | null>(null);
  const matches = feed.posts.filter(post => `${post.message} ${dateLabel(post.posted_on)}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = matches.slice(0, limit);
  const snapshot = feed.posts.some(p => p.source === "preview_snapshot");
  return <section className="facebook-feed" aria-label="All Things Tile Facebook posts">
    <div className="feed-header"><div className="feed-profile"><h1><a href={pageUrl} target="_blank" rel="noreferrer">ALL THINGS TILE</a></h1><a className="feed-handle" href={pageUrl} target="_blank" rel="noreferrer">@allthingstile</a><p className="following">15 Following</p><p>Tile installation and carpentry, custom flooring, bathroom and kitchen remodeling, property management/maintenance and handyman services available.</p><a href="https://www.allthingstile.net/" target="_blank" rel="noreferrer">allthingstile.net</a></div><div className="feed-actions"><label className="feed-search"><Search size={17} /><span className="sr-only">Search posts</span><input type="search" value={query} onChange={e => { setQuery(e.target.value); setLimit(10); }} placeholder="Search..." /></label><a className="facebook-follow" href={pageUrl} target="_blank" rel="noreferrer"><FacebookIcon />Like Us On Facebook</a></div></div>
    {(snapshot || feed.warning) && <p className="feed-preview-note">{feed.warning || "Preview: saved public posts from November 3, 2026. Automatic Facebook updates are not connected yet."}</p>}
    <div className="posts-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <div className="posts-column" key={column}>{visible.map((post, i) => i % columns === column ? <PostCard key={post.id} post={post} onOpen={image => setViewer({ post: i, image })} /> : null)}</div>)}</div>
    {!matches.length && <p className="empty-posts" role="status">{query ? <>No posts match “{query}”. <button className="text-button" onClick={() => setQuery("")}>Clear search</button></> : <>No posts to display yet. <a href={pageUrl} target="_blank" rel="noreferrer">Visit All Things Tile on Facebook</a></>}</p>}
    {matches.length > limit && <button className="load-more" onClick={() => setLimit(n => n + 10)}>Load more posts</button>}
    {query && <p className="search-count" role="status">{matches.length} matching {matches.length === 1 ? "post" : "posts"}</p>}
    {viewer && <PostViewer posts={visible} initialPost={viewer.post} initialImage={viewer.image} onClose={() => setViewer(null)} />}
  </section>;
}
