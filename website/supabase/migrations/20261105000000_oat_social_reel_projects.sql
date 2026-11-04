-- OAT Social AI Reel Studio production briefs and editable storyboards.
-- Isolated from OWN runtime, chatbot tables and travel knowledge.
create table if not exists public.social_reel_projects (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 destination text,
 target_duration_seconds integer not null default 30 check (target_duration_seconds between 5 and 180),
 aspect_ratio text not null default '9:16' check (aspect_ratio in ('9:16','4:5','1:1','16:9')),
 language_style text not null default 'Telugu-English',
 brief text not null default '',
 voiceover_script text not null default '',
 caption text not null default '',
 storyboard jsonb not null default '[]'::jsonb check (jsonb_typeof(storyboard) = 'array'),
 production_notes text not null default '',
 status text not null default 'draft' check (status in ('draft','storyboard_ready','in_production','ready_for_review','approved','rejected')),
 linked_content_id uuid references public.social_content_items(id) on delete set null,
 rendered_asset_url text,
 render_provider text,
 render_job_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists social_reel_projects_user_created_idx on public.social_reel_projects(user_id, created_at desc);
create index if not exists social_reel_projects_user_status_idx on public.social_reel_projects(user_id, status);
alter table public.social_reel_projects enable row level security;
drop policy if exists "Users manage their own social reel projects" on public.social_reel_projects;
create policy "Users manage their own social reel projects" on public.social_reel_projects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.social_reel_projects from anon;
grant select, insert, update, delete on public.social_reel_projects to authenticated;
