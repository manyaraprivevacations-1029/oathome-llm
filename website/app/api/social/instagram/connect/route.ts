import { NextRequest, NextResponse } from "next/server";
import { composioConfigured, composioRequest, createComposioState, instagramAuthConfigId } from "@/lib/social/composio-server";
import { requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkResponse = { redirect_url?: string; connected_account_id?: string; link_token?: string };

export async function POST(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to OAT Social AI again." }, { status: 401 });
  if (!composioConfigured()) {
    return NextResponse.json({
      error: "Composio setup is incomplete. Add COMPOSIO_API_KEY and COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID to the Preview environment.",
      configured: false,
    }, { status: 503 });
  }

  try {
    const state = createComposioState();
    const callback = new URL("/api/social/instagram/callback", request.url);
    callback.searchParams.set("state", state);
    const result = await composioRequest<LinkResponse>("/connected_accounts/link", {
      method: "POST",
      body: JSON.stringify({
        auth_config_id: instagramAuthConfigId(),
        user_id: user.id,
        alias: "oat-social-instagram-" + user.id,
        callback_url: callback.toString(),
      }),
    });
    if (!result.redirect_url) throw new Error("Composio did not return an authorization URL.");
    const response = NextResponse.json({ authorizationUrl: result.redirect_url }, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set("oat_composio_ig_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/social/instagram",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error("[OAT Social AI] Could not start Composio Instagram connection:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Could not start Instagram connection. Verify the Composio API key and Instagram auth configuration." }, { status: 503 });
  }
}
