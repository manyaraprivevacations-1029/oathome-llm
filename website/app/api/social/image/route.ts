import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Automatic Gemini image generation requires a paid model.
// OAT Social AI remains free-only: users can upload a licensed image in the studio.
export async function POST() {
  return NextResponse.json(
    { error: "Automatic image generation is not available on the free Gemini API tier. Upload your own image in the Post Studio instead." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
