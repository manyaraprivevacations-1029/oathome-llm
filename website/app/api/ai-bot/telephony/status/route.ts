import { NextResponse } from "next/server";
import { listDatabaseCallSessions } from "@/lib/ai-bot/database-store";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { getCallSessions } from "@/lib/ai-bot/store";

export async function GET() {
  if (isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try {
      const sessions = await listDatabaseCallSessions();
      const counts = sessions.reduce<Record<string, number>>((acc, session) => {
        acc[session.status] = (acc[session.status] ?? 0) + 1;
        return acc;
      }, {});
      return NextResponse.json({
        ok: true,
        source: "supabase",
        totalSessions: sessions.length,
        byStatus: counts,
        provider: process.env.VOICE_PROVIDER ?? "not_configured",
      });
    } catch (error) {
      return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load telephony status." }, { status: 500 });
    }
  }

  const sessions = getCallSessions();
  const counts = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.status] = (acc[session.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    source: "demo_adapter",
    totalSessions: sessions.length,
    byStatus: counts,
    provider: process.env.VOICE_PROVIDER ?? "not_configured",
  });
}
