-- Harden standalone AI Bot database security and indexes.
alter function public.ai_touch_updated_at() set search_path = public;
revoke execute on function public.ai_workspace_member(uuid) from public, anon, authenticated;
grant execute on function public.ai_workspace_member(uuid) to service_role;

create index if not exists ai_call_campaigns_workspace_idx on public.ai_call_campaigns(workspace_id);
create index if not exists ai_call_campaigns_employee_idx on public.ai_call_campaigns(employee_id);
create index if not exists ai_campaign_leads_lead_idx on public.ai_campaign_leads(lead_id);
create index if not exists ai_call_events_session_idx on public.ai_call_events(call_session_id);
create index if not exists ai_call_sessions_lead_idx on public.ai_call_sessions(lead_id);
create index if not exists ai_call_sessions_employee_idx on public.ai_call_sessions(employee_id);
create index if not exists ai_call_sessions_campaign_idx on public.ai_call_sessions(campaign_id);
create index if not exists ai_knowledge_workspace_idx on public.ai_knowledge_documents(workspace_id);
create index if not exists ai_lead_scores_workspace_idx on public.ai_lead_scores(workspace_id);
create index if not exists ai_lead_scores_call_idx on public.ai_lead_scores(call_session_id);
create index if not exists ai_followups_lead_idx on public.ai_followups(lead_id);
create index if not exists ai_followups_call_idx on public.ai_followups(call_session_id);
create index if not exists ai_followups_assigned_idx on public.ai_followups(assigned_to);
create index if not exists ai_workspace_members_user_idx on public.ai_workspace_members(user_id);
create index if not exists ai_leads_assigned_to_idx on public.ai_leads(assigned_to);

drop policy if exists ai_workspace_members_self_select on public.ai_workspace_members;
create policy ai_workspace_members_self_select
  on public.ai_workspace_members for select
  using ((select auth.uid()) = user_id);
