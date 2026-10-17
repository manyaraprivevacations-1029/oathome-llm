import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const expected = process.env.OATHOME_LLM_ACCESS_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!expected || !supplied) return false;

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, configured: isSupabaseConfigured(), error: "Unauthorized." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      service: "Supabase",
      error: "Set SUPABASE_URL and SUPABASE_SECRET_KEY in the hosting environment.",
    }, { status: 503 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("oathome_healthcheck").select("id").eq("id", true).maybeSingle();

    if (error) {
      const missingTable = error.code === "PGRST205" || error.code === "42P01";
      return NextResponse.json({
        ok: false,
        configured: true,
        service: "Supabase",
        error: missingTable
          ? "Supabase credentials work, but the oathome_healthcheck table is missing. Apply the SQL migration in website/supabase/migrations."
          : "Supabase connection failed. Verify the project URL, secret key, and database migration.",
      }, { status: 503 });
    }

    return NextResponse.json({ ok: true, configured: true, service: "Supabase", database: "reachable" }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      configured: false,
      service: "Supabase",
      error: error instanceof Error ? error.message : "Supabase connection failed.",
    }, { status: 503 });
  }
}
