create table if not exists public.social_reel_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text,
  target_duration_seconds integer not null default 30 check (target_duration_seconds between 5 and 180),
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('9:16','4:5','1:1','16:9')),
  language_style text not null default 'Telugu-English',
  brief text not null default '{}',
  voiceover_script text not null default '',
  caption text not null default '',
  storyboard jsonb not null default '[]'::jsonb,
  production_notes text not null default '',
  status text not null default 'storyboard_ready',
  linked_content_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_reel_projects_user_created_idx
  on public.social_reel_projects (user_id, created_at desc);

alter table public.social_reel_projects enable row level security;

drop policy if exists "Users can read their own reel projects" on public.social_reel_projects;
create policy "Users can read their own reel projects"
  on public.social_reel_projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own reel projects" on public.social_reel_projects;
create policy "Users can create their own reel projects"
  on public.social_reel_projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reel projects" on public.social_reel_projects;
create policy "Users can update their own reel projects"
  on public.social_reel_projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own reel projects" on public.social_reel_projects;
create policy "Users can delete their own reel projects"
  on public.social_reel_projects for delete
  using (auth.uid() = user_id);
