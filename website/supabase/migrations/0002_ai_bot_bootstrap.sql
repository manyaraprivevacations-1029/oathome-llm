-- Bootstrap the standalone On A Trip Holidays AI Bot workspace.
-- This migration is intentionally independent from the CRM schema.
-- The service-role backend can use AI_BOT_WORKSPACE_ID with this stable workspace UUID.
insert into public.ai_workspaces (id, name, slug, timezone)
values (
  '00000000-0000-4000-8000-000000000001',
  'On A Trip Holidays AI Bot',
  'on-a-trip-holidays-ai-bot',
  'Asia/Kolkata'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  timezone = excluded.timezone;

insert into public.ai_employees (
  id, workspace_id, slug, name, role, languages, voice_provider, active, system_prompt
)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'ananya',
  'Ananya',
  'Travel Sales Specialist',
  array['Telugu','Tenglish','English'],
  'provider-default',
  true,
  'You are Ananya, a professional travel sales specialist for On A Trip Holidays. Speak naturally in Telugu, Tenglish or English based on the customer preference. Qualify travel intent, destination, dates, travellers and budget. Use only approved knowledge and never invent availability or pricing.'
)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  languages = excluded.languages,
  voice_provider = excluded.voice_provider,
  active = excluded.active,
  system_prompt = excluded.system_prompt;

insert into public.ai_settings (
  workspace_id, recording_enabled, whatsapp_enabled, crm_enabled, ai_provider, ai_model, config
)
values (
  '00000000-0000-4000-8000-000000000001',
  true,
  false,
  false,
  null,
  null,
  '{"mode":"standalone","crm":"not_connected"}'::jsonb
)
on conflict (workspace_id) do update set
  recording_enabled = excluded.recording_enabled,
  whatsapp_enabled = excluded.whatsapp_enabled,
  crm_enabled = excluded.crm_enabled,
  config = excluded.config;

insert into public.ai_knowledge_documents (workspace_id, title, category, content, status)
values
  ('00000000-0000-4000-8000-000000000001','Char Dham Yatra','destination','Approved Char Dham destination and package information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Kedarnath & Badrinath','package','Approved Kedarnath and Badrinath travel information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Vaishno Devi & Amarnath','destination','Approved pilgrimage information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Kashmir','destination','Approved Kashmir destination information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Manali & Kasol','destination','Approved Manali and Kasol destination information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Leh Ladakh','destination','Approved Ladakh destination information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Kerala','destination','Approved Kerala destination information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Thailand','destination','Approved Thailand destination information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Puri Jagannath','destination','Approved Puri Jagannath pilgrimage information. Pricing and availability must come from a connected source before making commitments.','approved'),
  ('00000000-0000-4000-8000-000000000001','Kashi Ayodhya Gaya Prayagraj','destination','Approved pilgrimage information. Pricing and availability must come from a connected source before making commitments.','approved')
on conflict do nothing;

insert into public.ai_call_campaigns (
  id, workspace_id, employee_id, name, description, status, min_score, max_attempts
)
values
  ('00000000-0000-4000-8000-000000000201',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000101',
   'High Intent Pilgrimage Leads',
   'Initial high-intent outbound campaign for pilgrimage enquiries.',
   'ready', 70, 3),
  ('00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000101',
   'October Holiday Sales',
   'Holiday destination campaign prepared for later activation.',
   'draft', 40, 3)
on conflict (id) do update set
  employee_id = excluded.employee_id,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  min_score = excluded.min_score,
  max_attempts = excluded.max_attempts;

-- Recommended server environment:
-- AI_BOT_WORKSPACE_ID=00000000-0000-4000-8000-000000000001
