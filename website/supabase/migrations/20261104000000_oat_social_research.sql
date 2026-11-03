-- OAT Social AI evidence-backed trend and competitor research.
-- This table is isolated from OWN and the legacy chatbot schema.
create table if not exists public.social_trend_research (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 research_type text not null default 'trend' check (research_type in ('trend','competitor','audience','format')),
 title text not null,
 platform text not null default 'Instagram',
 destination text,
 competitor_handle text,
 content_format text,
 observed_on date,
 insight text not null,
 source_url text,
 metric_label text,
 metric_value text,
 content_angle text,
 created_at timestamptz not null default now()
);
create index if not exists social_trend_research_user_created_idx on public.social_trend_research(user_id, created_at desc);
create index if not exists social_trend_research_user_type_idx on public.social_trend_research(user_id, research_type);
alter table public.social_trend_research enable row level security;
drop policy if exists "Users manage their own social trend research" on public.social_trend_research;
create policy "Users manage their own social trend research" on public.social_trend_research for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.social_trend_research from anon;
grant select, insert, update, delete on public.social_trend_research to authenticated;
