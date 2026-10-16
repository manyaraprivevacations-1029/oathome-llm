import { NextResponse } from "next/server";

export async function GET() {
  const voiceConfigured = Boolean(process.env.VOICE_PROVIDER);
  const crmConfigured = Boolean(process.env.CRM_API_URL);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return NextResponse.json({
    ok: true,
    service: "on-a-trip-holidays-ai-bot",
    status: "ready",
    integrations: {
      voiceProvider: voiceConfigured ? "configured" : "not_configured",
      telephony: process.env.VOICE_FROM_NUMBER ? "configured" : "not_configured",
      crm: crmConfigured ? "configured" : "not_configured",
      supabase: supabaseConfigured ? "configured" : "not_connected",
    },
    conversationEngine: "ready",
    architecture: {
      leads: "adapter",
      calls: "provider_adapter",
      scoring: "local_engine",
    },
  });
}
