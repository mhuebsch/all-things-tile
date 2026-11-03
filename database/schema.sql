-- Applied only to the separate All Things Tile Supabase project.
create table public.posts (
  id text primary key,
  posted_on date not null,
  message text not null default '',
  permalink text not null check (permalink like 'https://www.facebook.com/%'),
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array'),
  reaction_count integer check (reaction_count >= 0),
  comment_count integer check (comment_count >= 0),
  source text not null check (source in ('preview_snapshot', 'facebook')),
  published boolean not null default false,
  captured_at timestamptz not null default now()
);
create index posts_published_date_idx on public.posts (posted_on desc, id desc) where published;
alter table public.posts enable row level security;
grant select on public.posts to anon, authenticated;
grant all on public.posts to service_role;
create policy "Read published project posts" on public.posts for select to anon, authenticated using (published);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 100),
  email text not null check (length(email) <= 254),
  message text not null check (length(message) between 10 and 5000),
  created_at timestamptz not null default now(),
  delivery_status text not null default 'stored' check (delivery_status in ('stored','sent','failed')),
  is_preview boolean not null default true
);
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;
grant all on public.inquiries to service_role;

create table public.contact_rate_limits (
  key_hash text primary key,
  hits integer not null default 1,
  expires_at timestamptz not null
);
create index contact_rate_limits_expiry_idx on public.contact_rate_limits (expires_at);
alter table public.contact_rate_limits enable row level security;
revoke all on public.contact_rate_limits from anon, authenticated;
grant all on public.contact_rate_limits to service_role;
-- Invoker privileges: callable only by the server's service role.
create function public.consume_contact_limit(p_key text, p_max integer default 5)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_hits integer;
begin
  if length(p_key) <> 64 or p_max < 1 or p_max > 50 then return false; end if;
  delete from public.contact_rate_limits where expires_at < now() - interval '1 day';
  insert into public.contact_rate_limits(key_hash, hits, expires_at)
  values (p_key, 1, now() + interval '10 minutes')
  on conflict (key_hash) do update
    set hits = case when public.contact_rate_limits.expires_at < now() then 1 else public.contact_rate_limits.hits + 1 end,
        expires_at = case when public.contact_rate_limits.expires_at < now() then now() + interval '10 minutes' else public.contact_rate_limits.expires_at end
  returning hits into current_hits;
  return current_hits <= p_max;
end;
$$;
revoke all on function public.consume_contact_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_contact_limit(text, integer) to service_role;

create table public.feed_sync_status (
  id boolean primary key default true check (id),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  status text not null default 'not_connected',
  post_count integer not null default 0
);
alter table public.feed_sync_status enable row level security;
revoke all on public.feed_sync_status from anon, authenticated;
grant all on public.feed_sync_status to service_role;
insert into public.feed_sync_status(id) values (true);
