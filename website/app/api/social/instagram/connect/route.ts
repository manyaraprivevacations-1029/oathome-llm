import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, metaAppId, metaRedirectUri, requireSocialUser } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in to OAT Social AI again." }, { status: 401 });

  const appId = metaAppId();
  const appSecret = process.env.SOCIAL_META_APP_SECRET?.trim() || "";
  const encryptionKey = process.env.SOCIAL_META_TOKEN_ENCRYPTION_KEY?.trim() || "";
  const serviceKey = process.env.SOCIAL_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SOCIAL_SUPABASE_SECRET_KEY?.trim() || "";
  if (!appId || !appSecret || !encryptionKey || !serviceKey) {
    return NextResponse.json({
      error: "Instagram connection setup is incomplete. Configure the Meta app and secure Social Supabase token storage first.",
      configured: false,
    }, { status: 503 });
  }

  try {
    const state = createOAuthState(user.id);
    const redirectUri = metaRedirectUri(request);
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
    url.searchParams.set("state", state);
    const response = NextResponse.json({ authorizationUrl: url.toString() }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set("oat_social_ig_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/social/instagram",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start Instagram connection." }, { status: 503 });
  }
}
