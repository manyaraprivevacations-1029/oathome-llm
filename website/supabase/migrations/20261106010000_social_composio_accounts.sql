-- Store Composio connected-account references instead of provider OAuth tokens.
-- This migration only changes the isolated OAT Social AI table.
alter table public.social_platform_accounts
  alter column access_token_encrypted drop not null;

alter table public.social_platform_accounts
  add column if not exists composio_connected_account_id text;

create unique index if not exists social_platform_accounts_composio_id_idx
  on public.social_platform_accounts(composio_connected_account_id)
  where composio_connected_account_id is not null;
