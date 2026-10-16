import { NextResponse } from "next/server";
import { knowledgeItems } from "@/lib/ai-bot/knowledge";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { listDatabaseKnowledge } from "@/lib/ai-bot/database-store";

export async function GET() {
  if (isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try { return NextResponse.json({ok:true,source:"supabase",items:await listDatabaseKnowledge()}); }
    catch(error){ return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unable to load knowledge base"},{status:500}); }
  }
  return NextResponse.json({ok:true,source:"demo_adapter",items:knowledgeItems});
}
