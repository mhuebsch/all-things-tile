create function public.replace_facebook_posts(p_posts jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_posts) <> 'array' or jsonb_array_length(p_posts) > 1000 then
    raise exception 'Invalid post cache';
  end if;
  -- Old, deleted, and preview-only posts stop appearing when a full sync succeeds.
  update public.posts set published = false where published;
  insert into public.posts
  select * from jsonb_populate_recordset(null::public.posts, p_posts)
  on conflict(id) do update set
    posted_on = excluded.posted_on, message = excluded.message,
    permalink = excluded.permalink, media = excluded.media,
    reaction_count = excluded.reaction_count, comment_count = excluded.comment_count,
    source = excluded.source, published = excluded.published, captured_at = excluded.captured_at;
end;
$$;
revoke all on function public.replace_facebook_posts(jsonb) from public, anon, authenticated;
grant execute on function public.replace_facebook_posts(jsonb) to service_role;
