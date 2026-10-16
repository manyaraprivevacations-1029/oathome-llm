import { NextResponse } from "next/server";
import { createDatabaseLead, listDatabaseLeads } from "@/lib/ai-bot/database-store";
import { getSupabaseWorkspaceId, isSupabaseConfigured } from "@/lib/ai-bot/supabase";
import { listLeads } from "@/lib/ai-bot/store";

const databaseMode = () => isSupabaseConfigured() && Boolean(getSupabaseWorkspaceId());

export async function GET() {
  if (databaseMode()) {
    try {
      return NextResponse.json({ ok: true, source: "supabase", leads: await listDatabaseLeads() });
    } catch (error) {
      return NextResponse.json({ ok: false, source: "supabase", error: error instanceof Error ? error.message : "Unable to load leads" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, source: "demo_adapter", leads: listLeads() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!databaseMode()) {
    return NextResponse.json({ ok: false, error: "Standalone Supabase is required to create persistent leads." }, { status: 503 });
  }
  if (!body?.name || !body?.phone) {
    return NextResponse.json({ ok: false, error: "name and phone are required" }, { status: 400 });
  }
  const travellers = body.travellers === undefined ? undefined : Number(body.travellers);
  if (travellers !== undefined && (!Number.isInteger(travellers) || travellers < 1)) {
    return NextResponse.json({ ok: false, error: "travellers must be a positive integer" }, { status: 400 });
  }
  try {
    const lead = await createDatabaseLead({
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: body.email ? String(body.email).trim() : undefined,
      destination: body.destination ? String(body.destination).trim() : undefined,
      language: body.language ? String(body.language) : undefined,
      source: body.source ? String(body.source) : "manual",
      travellers,
      travelDate: body.travelDate ? String(body.travelDate) : undefined,
      budget: body.budget === undefined || body.budget === "" ? undefined : Number(body.budget),
    });
    return NextResponse.json({ ok: true, source: "supabase", lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create lead" }, { status: 500 });
  }
}
