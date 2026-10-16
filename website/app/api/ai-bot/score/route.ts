import { NextResponse } from "next/server";
import { scoreLead } from "@/lib/ai-bot/scoring";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { updateDatabaseLeadScore } from "@/lib/ai-bot/database-store";

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  const result = scoreLead(input);
  if (input.leadId && isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try {
      const lead = await updateDatabaseLeadScore(input.leadId, result.score, result.status);
      return NextResponse.json({ok:true,source:"supabase",...result,lead});
    } catch(error) {
      return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unable to persist score",...result},{status:500});
    }
  }
  return NextResponse.json({ok:true,source:"demo_adapter",...result});
}
