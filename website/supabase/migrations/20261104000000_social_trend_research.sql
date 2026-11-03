-- OAT Social AI trend research only. Does not modify OWN or legacy AI-bot tables.
create table if not exists public.social_trend_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platform text not null default 'Instagram',
  destination text,
  insight text not null,
  source_url text,
  content_angle text,
  created_at timestamptz not null default now()
);
alter table public.social_trend_research enable row level security;
revoke all on public.social_trend_research from anon;
grant select, insert, update, delete on public.social_trend_research to authenticated;
drop policy if exists "Users manage their own social trend research" on public.social_trend_research;
create policy "Users manage their own social trend research"
on public.social_trend_research for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
