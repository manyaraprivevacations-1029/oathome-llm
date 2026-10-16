import { NextResponse } from "next/server";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { createDatabaseFollowup } from "@/lib/ai-bot/database-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.leadId) return NextResponse.json({ok:false,error:"leadId is required"},{status:400});
  if (isSupabaseConfigured() && getSupabaseWorkspaceId()) {
    try {
      const scheduledAt = body.scheduledAt ?? new Date(Date.now()+24*60*60*1000).toISOString();
      return NextResponse.json({ok:true,source:"supabase",followUp:await createDatabaseFollowup({
        leadId:body.leadId, scheduledAt, reason:body.reason, employeeId:body.employeeId ?? "ananya"
      })},{status:201});
    } catch(error) {
      return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unable to create follow-up"},{status:500});
    }
  }
  return NextResponse.json({ok:true,mode:"adapter_only",followUp:{id:crypto.randomUUID(),leadId:body.leadId,reason:body.reason??"AI call follow-up",preferredTime:body.preferredTime??"customer_preferred_time",status:"pending"}},{status:201});
}
