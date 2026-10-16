import { NextRequest, NextResponse } from "next/server";

// The previous travel-sales backend is not part of OWN LLM. Keep its API surface
// disabled until those endpoints have been separately reviewed and secured.
export function middleware(_request: NextRequest) {
  return new NextResponse(null, { status: 404 });
}

export const config = {
  matcher: ["/api/ai-bot/:path*"],
};
