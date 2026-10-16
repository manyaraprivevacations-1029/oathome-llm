import { getSupabaseAdmin, getSupabaseWorkspaceId } from "./supabase";
import type { Database, Json } from "./database.types";
import type { CallSession, Lead, AiEmployee, LeadStatus, CallStatus } from "./types";

function workspaceId(): string {
  const id = getSupabaseWorkspaceId();
  if (!id) throw new Error("AI_BOT_WORKSPACE_ID is not configured.");
  return id;
}

export async function listDatabaseLeads(): Promise<Lead[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_leads")
    .select("id,name,phone,destination,travel_date,travellers,language,score,status,source,last_contact_at")
    .eq("workspace_id", workspaceId())
    .order("score", { ascending: false });

  if (error) throw new Error(`Unable to load AI bot leads: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    destination: row.destination ?? undefined,
    travelDate: row.travel_date ?? undefined,
    travellers: row.travellers ?? undefined,
    language: row.language ?? undefined,
    score: row.score ?? undefined,
    status: (row.status as LeadStatus) ?? undefined,
    source: row.source ?? undefined,
    lastContactAt: row.last_contact_at ?? undefined,
  }));
}

export async function getDatabaseLead(id: string): Promise<Lead | undefined> {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_leads")
    .select("id,name,phone,destination,travel_date,travellers,language,score,status,source,last_contact_at")
    .eq("workspace_id", workspaceId())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load AI bot lead: ${error.message}`);
  if (!data) return undefined;

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    destination: data.destination ?? undefined,
    travelDate: data.travel_date ?? undefined,
    travellers: data.travellers ?? undefined,
    language: data.language ?? undefined,
    score: data.score ?? undefined,
    status: (data.status as LeadStatus) ?? undefined,
    source: data.source ?? undefined,
    lastContactAt: data.last_contact_at ?? undefined,
  };
}

export async function listDatabaseCallSessions(): Promise<CallSession[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_call_sessions")
    .select("id,lead_id,employee_id,status,provider,provider_call_id,started_at,ended_at,duration_seconds,recording_url,summary,score,outcome")
    .eq("workspace_id", workspaceId())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load AI bot call sessions: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    employeeId: row.employee_id ?? "ananya",
    status: row.status as CallStatus,
    provider: row.provider ?? "unknown",
    providerCallId: row.provider_call_id ?? undefined,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  }));
}

export async function insertDatabaseCallSession(session: CallSession): Promise<CallSession> {
  const employee = await getSupabaseAdmin().from("ai_employees").select("id").eq("workspace_id", workspaceId()).eq("slug", session.employeeId).maybeSingle();
  const employeeId = employee.data?.id ?? null;
  const { data, error } = await getSupabaseAdmin()
    .from("ai_call_sessions")
    .insert({
      workspace_id: workspaceId(),
      id: session.id,
      lead_id: session.leadId,
      employee_id: employeeId,
      provider: session.provider,
      provider_call_id: session.providerCallId ?? null,
      status: session.status,
      started_at: session.startedAt ?? null,
      ended_at: session.endedAt ?? null,
    })
    .select("id,lead_id,employee_id,status,provider,provider_call_id,started_at,ended_at")
    .single();

  if (error) throw new Error(`Unable to save AI bot call session: ${error.message}`);

  return {
    id: data.id,
    leadId: data.lead_id,
    employeeId: data.employee_id ?? session.employeeId ?? "ananya",
    status: data.status as CallStatus,
    provider: data.provider ?? session.provider ?? "unknown",
    providerCallId: data.provider_call_id ?? undefined,
    startedAt: data.started_at ?? undefined,
    endedAt: data.ended_at ?? undefined,
  };
}


export async function listDatabaseEmployees(): Promise<AiEmployee[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_employees")
    .select("id,slug,name,role,languages,voice_provider,voice_id,system_prompt,active")
    .eq("workspace_id", workspaceId())
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Unable to load AI employees: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.slug,
    name: row.name,
    role: row.role,
    languages: row.languages,
    voice: row.voice_id ?? row.voice_provider ?? "provider-default",
    active: row.active,
    systemPrompt: row.system_prompt,
  }));
}

export async function listDatabaseCampaigns() {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_call_campaigns")
    .select("id,name,description,status,min_score,max_attempts,employee_id,starts_at,ends_at")
    .eq("workspace_id", workspaceId())
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Unable to load campaigns: ${error.message}`);
  return data ?? [];
}

export async function listDatabaseKnowledge() {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_knowledge_documents")
    .select("id,title,category,content,status,metadata,updated_at")
    .eq("workspace_id", workspaceId())
    .order("title", { ascending: true });
  if (error) throw new Error(`Unable to load knowledge base: ${error.message}`);
  return data ?? [];
}

export async function listDatabaseSettings() {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_settings")
    .select("ai_model,ai_provider,voice_provider,voice_from_number,crm_enabled,whatsapp_enabled,recording_enabled,config")
    .eq("workspace_id", workspaceId())
    .maybeSingle();
  if (error) throw new Error(`Unable to load AI settings: ${error.message}`);
  return data;
}

export async function createDatabaseLead(input: {
  name: string; phone: string; email?: string; destination?: string; travelDate?: string;
  travellers?: number; budget?: number; language?: string; source?: string;
}): Promise<Lead> {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_leads")
    .insert({
      workspace_id: workspaceId(), name: input.name, phone: input.phone,
      email: input.email ?? null, destination: input.destination ?? null,
      travel_date: input.travelDate ?? null, travellers: input.travellers ?? null,
      budget: input.budget ?? null, language: input.language ?? null,
      source: input.source ?? "manual", intent: "unknown", score: 0, status: "Cold",
    })
    .select("id,name,phone,destination,travel_date,travellers,language,score,status,source,last_contact_at")
    .single();
  if (error) throw new Error(`Unable to create AI bot lead: ${error.message}`);
  return {
    id:data.id,name:data.name,phone:data.phone,destination:data.destination ?? undefined,
    travelDate:data.travel_date ?? undefined,travellers:data.travellers ?? undefined,
    language:data.language ?? undefined,score:data.score ?? undefined,status:(data.status as LeadStatus) ?? undefined,
    source:data.source ?? undefined,lastContactAt:data.last_contact_at ?? undefined,
  };
}

export async function listDatabaseMetrics() {
  const [leads, calls] = await Promise.all([
    getSupabaseAdmin().from("ai_leads").select("score,status,last_contact_at,created_at").eq("workspace_id", workspaceId()),
    getSupabaseAdmin().from("ai_call_sessions").select("status,duration_seconds,created_at").eq("workspace_id", workspaceId()),
  ]);
  if (leads.error) throw new Error(`Unable to load lead metrics: ${leads.error.message}`);
  if (calls.error) throw new Error(`Unable to load call metrics: ${calls.error.message}`);
  const ls=leads.data ?? [], cs=calls.data ?? [];
  const answered=cs.filter(x=>["in_progress","completed"].includes(x.status)).length;
  const qualified=ls.filter(x=>(x.score ?? 0)>=50).length;
  const hot=ls.filter(x=>x.status==="Hot").length;
  return {
    totalLeads:ls.length, contacted:cs.length, answered,
    qualified, hot, warm:ls.filter(x=>x.status==="Warm").length,
    cold:ls.filter(x=>x.status==="Cold").length,
    contactRate:ls.length?Math.round(answered/ls.length*1000)/10:0,
    qualificationRate:ls.length?Math.round(qualified/ls.length*1000)/10:0,
    hotRate:ls.length?Math.round(hot/ls.length*1000)/10:0,
    averageCallDurationSeconds:cs.length?Math.round(cs.reduce((a,x)=>a+(x.duration_seconds ?? 0),0)/cs.length):0,
  };
}


export async function updateDatabaseLeadScore(id: string, score: number, status: LeadStatus) {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_leads")
    .update({ score, status })
    .eq("workspace_id", workspaceId())
    .eq("id", id)
    .select("id,name,phone,destination,travel_date,travellers,language,score,status,source,last_contact_at")
    .single();
  if (error) throw new Error(`Unable to update AI bot lead score: ${error.message}`);
  return {
    id:data.id,name:data.name,phone:data.phone,destination:data.destination ?? undefined,
    travelDate:data.travel_date ?? undefined,travellers:data.travellers ?? undefined,
    language:data.language ?? undefined,score:data.score ?? undefined,status:data.status as LeadStatus,
    source:data.source ?? undefined,lastContactAt:data.last_contact_at ?? undefined,
  };
}


export async function createDatabaseFollowup(input: {leadId:string; scheduledAt:string; reason?:string; employeeId?:string}) {
  const employee = input.employeeId ? await getSupabaseAdmin().from("ai_employees").select("id").eq("workspace_id", workspaceId()).eq("slug", input.employeeId).maybeSingle() : null;
  const { data, error } = await getSupabaseAdmin().from("ai_followups").insert({
    workspace_id: workspaceId(), lead_id: input.leadId, assigned_to: employee?.data?.id ?? null,
    scheduled_for: input.scheduledAt, notes: input.reason ?? "AI call follow-up", status: "pending"
  }).select("id,lead_id,scheduled_for,notes,status").single();
  if (error) throw new Error(`Unable to create AI bot follow-up: ${error.message}`);
  return data;
}


export async function findDatabaseCallSessionByProviderId(providerCallId: string) {
  if (!providerCallId) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("ai_call_sessions")
    .select("id,workspace_id,lead_id,employee_id,status,provider,provider_call_id,started_at,ended_at,duration_seconds,recording_url,summary,score,outcome")
    .eq("workspace_id", workspaceId())
    .eq("provider_call_id", providerCallId)
    .maybeSingle();
  if (error) throw new Error(`Unable to find AI bot call session: ${error.message}`);
  return data;
}

export async function updateDatabaseCallSessionFromProvider(input: {
  providerCallId: string;
  status?: CallStatus;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  summary?: string;
  score?: number;
  outcome?: string;
  fromNumber?: string;
  toNumber?: string;
}) {
  const existing = await findDatabaseCallSessionByProviderId(input.providerCallId);
  if (!existing) return null;

  const patch: Database["public"]["Tables"]["ai_call_sessions"]["Update"] = {};
  if (input.status) patch.status = input.status;
  if (input.startedAt) patch.started_at = input.startedAt;
  if (input.endedAt) patch.ended_at = input.endedAt;
  if (input.durationSeconds !== undefined) patch.duration_seconds = input.durationSeconds;
  if (input.recordingUrl) patch.recording_url = input.recordingUrl;
  if (input.summary) patch.summary = input.summary;
  if (input.score !== undefined) patch.score = input.score;
  if (input.outcome) patch.outcome = input.outcome;
  if (input.fromNumber) patch.from_number = input.fromNumber;
  if (input.toNumber) patch.to_number = input.toNumber;

  if (Object.keys(patch).length === 0) return existing;
  const { data, error } = await getSupabaseAdmin()
    .from("ai_call_sessions")
    .update(patch)
    .eq("workspace_id", workspaceId())
    .eq("id", existing.id)
    .select("id,lead_id,employee_id,status,provider,provider_call_id,started_at,ended_at,duration_seconds,recording_url,summary,score,outcome")
    .single();
  if (error) throw new Error(`Unable to update AI bot call session: ${error.message}`);
  return data;
}

export async function insertDatabaseCallEvent(input: {
  callSessionId: string;
  eventType: string;
  status?: string;
  payload: unknown;
  occurredAt?: string;
}) {
  const { error } = await getSupabaseAdmin().from("ai_call_events").insert({
    call_session_id: input.callSessionId,
    event_type: input.eventType,
    status: input.status ?? null,
    payload: (input.payload ?? {}) as Json,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to save AI bot call event: ${error.message}`);
}

export async function insertDatabaseTranscriptLines(callSessionId: string, lines: Array<{
  speaker: "ai" | "customer" | "system";
  text: string;
  language?: string;
  sequence: number;
}>) {
  if (!lines.length) return;
  const rows = lines.map((line) => ({
    call_session_id: callSessionId,
    speaker: line.speaker,
    text: line.text,
    language: line.language ?? null,
    sequence: line.sequence,
  }));
  const { error } = await getSupabaseAdmin()
    .from("ai_call_transcripts")
    .upsert(rows, { onConflict: "call_session_id,sequence" });
  if (error) throw new Error(`Unable to save AI bot transcript: ${error.message}`);
}

export async function updateDatabaseLeadLastContact(leadId: string, at = new Date().toISOString()) {
  const { error } = await getSupabaseAdmin()
    .from("ai_leads")
    .update({ last_contact_at: at })
    .eq("workspace_id", workspaceId())
    .eq("id", leadId);
  if (error) throw new Error(`Unable to update AI bot lead contact time: ${error.message}`);
}
