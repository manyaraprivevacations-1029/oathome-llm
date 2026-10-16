import { NextResponse } from "next/server";
import { aiEmployees } from "@/lib/ai-bot/config";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { listDatabaseEmployees } from "@/lib/ai-bot/database-store";

export async function GET() {
  if (isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try { return NextResponse.json({ ok:true, source:"supabase", employees:await listDatabaseEmployees() }); }
    catch (error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unable to load employees"},{status:500}); }
  }
  return NextResponse.json({ ok:true, source:"demo_adapter", employees:aiEmployees });
}
