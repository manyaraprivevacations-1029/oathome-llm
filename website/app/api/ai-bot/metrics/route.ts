import { NextResponse } from "next/server";
import { getLeads } from "@/lib/ai-bot/store";
import { calculateFunnelMetrics } from "@/lib/ai-bot/metrics";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { listDatabaseMetrics } from "@/lib/ai-bot/database-store";

export async function GET() {
  if (isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try { return NextResponse.json({ok:true,source:"supabase",metrics:await listDatabaseMetrics()}); }
    catch(error){ return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unable to load metrics"},{status:500}); }
  }
  return NextResponse.json({ok:true,source:"demo_adapter",metrics:calculateFunnelMetrics(getLeads())});
}
