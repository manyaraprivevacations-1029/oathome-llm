-- OAT Social AI platform account connections.
-- OAuth tokens are encrypted by the application before storage.
-- This table is separate from OWN and all legacy travel-bot tables.

create table if not exists public.social_platform_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram')),
  platform_account_id text not null,
  account_username text,
  account_type text,
  access_token_encrypted text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, platform_account_id)
);

create index if not exists social_platform_accounts_user_platform_idx
  on public.social_platform_accounts(user_id, platform);

alter table public.social_platform_accounts enable row level security;
revoke all on public.social_platform_accounts from anon, authenticated;
grant all on public.social_platform_accounts to service_role;

comment on table public.social_platform_accounts is
  'OAT Social AI only. OAuth tokens are application-encrypted and accessible only to the server service role.';
