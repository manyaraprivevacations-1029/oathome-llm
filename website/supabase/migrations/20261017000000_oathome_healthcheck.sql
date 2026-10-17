-- Minimal private health-check table for verifying the OATHome server connection.
-- It contains no user data and is not intended for browser/client access.

create table if not exists public.oathome_healthcheck (
  id boolean primary key default true check (id = true),
  created_at timestamptz not null default now()
);

insert into public.oathome_healthcheck (id)
values (true)
on conflict (id) do nothing;

alter table public.oathome_healthcheck enable row level security;

revoke all on table public.oathome_healthcheck from anon, authenticated;
grant select on table public.oathome_healthcheck to service_role;
