import { NextResponse } from "next/server";
import { listDatabaseSettings } from "@/lib/ai-bot/database-store";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";

export async function GET() {
  if (!isSupabaseConfigured() || !getSupabaseWorkspaceId()) {
    return NextResponse.json({
      ok: true,
      source: "environment",
      settings: {
        ai_model: process.env.AI_MODEL ?? "local-rule-based",
        ai_provider: process.env.AI_PROVIDER ?? "local",
        voice_provider: process.env.VOICE_PROVIDER ?? null,
        voice_from_number: process.env.VOICE_FROM_NUMBER ?? null,
        crm_enabled: Boolean(process.env.CRM_API_URL),
        whatsapp_enabled: Boolean(process.env.WHATSAPP_API_URL),
        recording_enabled: Boolean(process.env.VOICE_PROVIDER),
      },
    });
  }

  try {
    return NextResponse.json({
      ok: true,
      source: "supabase",
      settings: await listDatabaseSettings(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load settings" },
      { status: 500 },
    );
  }
}
