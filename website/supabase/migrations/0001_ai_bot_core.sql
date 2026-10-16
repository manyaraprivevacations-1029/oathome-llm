create extension if not exists pgcrypto;

create table if not exists public.ai_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_workspace_members (
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  role text not null,
  languages text[] not null default '{}',
  voice_provider text,
  voice_id text,
  system_prompt text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists public.ai_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  content text not null,
  status text not null default 'approved' check (status in ('draft','approved','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  external_id text,
  name text not null,
  phone text not null,
  email text,
  destination text,
  travel_date date,
  travellers integer,
  budget numeric(12,2),
  language text,
  source text,
  intent text not null default 'unknown' check (intent in ('unknown','low','medium','high')),
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'Cold' check (status in ('Hot','Warm','Cold')),
  assigned_to uuid references auth.users(id) on delete set null,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_leads_workspace_score_idx
  on public.ai_leads(workspace_id, score desc);
create index if not exists ai_leads_workspace_phone_idx
  on public.ai_leads(workspace_id, phone);

create table if not exists public.ai_call_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  employee_id uuid references public.ai_employees(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','ready','running','paused','completed')),
  min_score integer not null default 0 check (min_score between 0 and 100),
  max_attempts integer not null default 3 check (max_attempts between 1 and 12),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_campaign_leads (
  campaign_id uuid not null references public.ai_call_campaigns(id) on delete cascade,
  lead_id uuid not null references public.ai_leads(id) on delete cascade,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  state text not null default 'pending' check (state in ('pending','queued','calling','completed','retry','stopped')),
  created_at timestamptz not null default now(),
  primary key (campaign_id, lead_id)
);

create table if not exists public.ai_call_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  lead_id uuid not null references public.ai_leads(id) on delete cascade,
  employee_id uuid references public.ai_employees(id) on delete set null,
  campaign_id uuid references public.ai_call_campaigns(id) on delete set null,
  provider text,
  provider_call_id text,
  direction text not null default 'outbound' check (direction in ('inbound','outbound')),
  status text not null default 'queued' check (status in ('queued','ringing','in_progress','completed','failed','no_answer')),
  from_number text,
  to_number text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  recording_url text,
  transcript_url text,
  summary text,
  score integer check (score between 0 and 100),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_call_sessions_workspace_created_idx
  on public.ai_call_sessions(workspace_id, created_at desc);
create index if not exists ai_call_sessions_provider_call_idx
  on public.ai_call_sessions(provider, provider_call_id);

create table if not exists public.ai_call_events (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.ai_call_sessions(id) on delete cascade,
  event_type text not null,
  status text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.ai_call_transcripts (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.ai_call_sessions(id) on delete cascade,
  speaker text not null check (speaker in ('ai','customer','system')),
  text text not null,
  language text,
  sequence integer not null,
  confidence numeric(5,4),
  created_at timestamptz not null default now(),
  unique (call_session_id, sequence)
);

create table if not exists public.ai_lead_scores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  lead_id uuid not null references public.ai_leads(id) on delete cascade,
  call_session_id uuid references public.ai_call_sessions(id) on delete set null,
  score integer not null check (score between 0 and 100),
  status text not null check (status in ('Hot','Warm','Cold')),
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_lead_scores_lead_created_idx
  on public.ai_lead_scores(lead_id, created_at desc);

create table if not exists public.ai_followups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ai_workspaces(id) on delete cascade,
  lead_id uuid not null references public.ai_leads(id) on delete cascade,
  call_session_id uuid references public.ai_call_sessions(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  type text not null default 'call' check (type in ('call','whatsapp','salesperson','other')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled','failed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_followups_due_idx
  on public.ai_followups(workspace_id, status, scheduled_for);

create table if not exists public.ai_settings (
  workspace_id uuid primary key references public.ai_workspaces(id) on delete cascade,
  voice_provider text,
  voice_from_number text,
  ai_provider text,
  ai_model text,
  recording_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  crm_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.ai_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ai_workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
  );
$$;

alter table public.ai_workspaces enable row level security;
alter table public.ai_workspace_members enable row level security;
alter table public.ai_employees enable row level security;
alter table public.ai_knowledge_documents enable row level security;
alter table public.ai_leads enable row level security;
alter table public.ai_call_campaigns enable row level security;
alter table public.ai_campaign_leads enable row level security;
alter table public.ai_call_sessions enable row level security;
alter table public.ai_call_events enable row level security;
alter table public.ai_call_transcripts enable row level security;
alter table public.ai_lead_scores enable row level security;
alter table public.ai_followups enable row level security;
alter table public.ai_settings enable row level security;

create policy if not exists ai_workspaces_member_select
  on public.ai_workspaces for select
  using (public.ai_workspace_member(id));

create policy if not exists ai_workspace_members_self_select
  on public.ai_workspace_members for select
  using (user_id = auth.uid());

create policy if not exists ai_employees_member_all
  on public.ai_employees for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_knowledge_member_all
  on public.ai_knowledge_documents for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_leads_member_all
  on public.ai_leads for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_campaigns_member_all
  on public.ai_call_campaigns for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_campaign_leads_member_all
  on public.ai_campaign_leads for all
  using (
    exists (
      select 1 from public.ai_call_campaigns c
      where c.id = campaign_id and public.ai_workspace_member(c.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.ai_call_campaigns c
      where c.id = campaign_id and public.ai_workspace_member(c.workspace_id)
    )
  );

create policy if not exists ai_call_sessions_member_all
  on public.ai_call_sessions for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_call_events_member_all
  on public.ai_call_events for all
  using (
    exists (
      select 1 from public.ai_call_sessions s
      where s.id = call_session_id and public.ai_workspace_member(s.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.ai_call_sessions s
      where s.id = call_session_id and public.ai_workspace_member(s.workspace_id)
    )
  );

create policy if not exists ai_call_transcripts_member_all
  on public.ai_call_transcripts for all
  using (
    exists (
      select 1 from public.ai_call_sessions s
      where s.id = call_session_id and public.ai_workspace_member(s.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.ai_call_sessions s
      where s.id = call_session_id and public.ai_workspace_member(s.workspace_id)
    )
  );

create policy if not exists ai_lead_scores_member_all
  on public.ai_lead_scores for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_followups_member_all
  on public.ai_followups for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create policy if not exists ai_settings_member_all
  on public.ai_settings for all
  using (public.ai_workspace_member(workspace_id))
  with check (public.ai_workspace_member(workspace_id));

create or replace function public.ai_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_workspaces','ai_employees','ai_knowledge_documents','ai_leads',
    'ai_call_campaigns','ai_call_sessions','ai_followups','ai_settings'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'trg_'||t||'_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.ai_touch_updated_at()',
      'trg_'||t||'_updated_at', t
    );
  end loop;
end $$;
