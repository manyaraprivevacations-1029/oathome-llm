-- OAT Social AI: isolated tables for the new social workspace.
-- This migration intentionally does not alter OWN or the legacy AI-bot schema.

create table if not exists public.social_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null default 'On A Trip Holidays',
  website_url text,
  instagram_handle text,
  brand_voice text,
  audience_notes text,
  content_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brand_name)
);

create table if not exists public.social_content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content_type text not null check (content_type in ('reel','carousel','post','story')),
  status text not null default 'draft' check (status in ('draft','in_review','approved','rejected','scheduled','published')),
  caption text,
  script text,
  asset_path text,
  scheduled_for timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_content_items_user_created_idx
  on public.social_content_items(user_id, created_at desc);
create index if not exists social_content_items_user_status_idx
  on public.social_content_items(user_id, status);

alter table public.social_brand_profiles enable row level security;
alter table public.social_content_items enable row level security;

drop policy if exists "Users manage their own social brand profiles" on public.social_brand_profiles;
create policy "Users manage their own social brand profiles"
  on public.social_brand_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own social content" on public.social_content_items;
create policy "Users manage their own social content"
  on public.social_content_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.social_brand_profiles from anon;
revoke all on public.social_content_items from anon;
grant select, insert, update, delete on public.social_brand_profiles to authenticated;
grant select, insert, update, delete on public.social_content_items to authenticated;
