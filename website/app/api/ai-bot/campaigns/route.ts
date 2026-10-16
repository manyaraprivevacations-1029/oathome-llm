import { NextResponse } from "next/server";
import { campaigns } from "@/lib/ai-bot/campaigns";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { listDatabaseCampaigns } from "@/lib/ai-bot/database-store";

export async function GET() {
  if (isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try { return NextResponse.json({ok:true,source:"supabase",campaigns:await listDatabaseCampaigns()}); }
    catch(error){ return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unable to load campaigns"},{status:500}); }
  }
  return NextResponse.json({ok:true,source:"demo_adapter",campaigns});
}
export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(!body?.name) return NextResponse.json({ok:false,error:"Campaign name is required"},{status:400});
  return NextResponse.json({ok:true,mode:"adapter_only",message:"Campaign request validated. Persistence will be connected through the database adapter.",campaign:{...body,id:crypto.randomUUID(),status:"draft"}},{status:201});
}
