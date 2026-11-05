import { NextRequest, NextResponse } from "next/server";
import { encryptMetaToken, getSocialAdmin, metaAppId, metaRedirectUri, verifyOAuthState } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TokenResponse = { access_token?: string; user_id?: number | string; expires_in?: number; error_message?: string };
type ProfileResponse = { user_id?: number | string; id?: number | string; username?: string; account_type?: string };

function finish(request: NextRequest, result: string) {
  const url = new URL("/social/instagram", request.url);
  url.searchParams.set("connection", result);
  const response = NextResponse.redirect(url);
  response.cookies.set("oat_social_ig_state", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/social/instagram", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return finish(request, "cancelled");
  const cookieState = request.cookies.get("oat_social_ig_state")?.value || "";
  let userId: string | null = null;
  try { userId = verifyOAuthState(cookieState, state); } catch { userId = null; }
  if (!userId || !code) return finish(request, "invalid_state");

  const appId = metaAppId();
  const appSecret = process.env.SOCIAL_META_APP_SECRET?.trim() || "";
  if (!appId || !appSecret) return finish(request, "setup_error");

  try {
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: metaRedirectUri(request),
      code,
    });
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const shortToken = await shortResponse.json() as TokenResponse;
    if (!shortResponse.ok || !shortToken.access_token) return finish(request, "token_error");

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const longToken = await longResponse.json() as TokenResponse;
    const accessToken = longResponse.ok && longToken.access_token ? longToken.access_token : shortToken.access_token;
    const expiresIn = longResponse.ok && longToken.expires_in ? longToken.expires_in : shortToken.expires_in || 3600;

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "user_id,username,account_type");
    profileUrl.searchParams.set("access_token", accessToken);
    const profileResponse = await fetch(profileUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const profile = await profileResponse.json() as ProfileResponse;
    if (!profileResponse.ok || !(profile.user_id || profile.id)) return finish(request, "profile_error");

    const admin = getSocialAdmin();
    const { error } = await admin.from("social_platform_accounts").upsert({
      user_id: userId,
      platform: "instagram",
      platform_account_id: String(profile.user_id || profile.id),
      account_username: profile.username || null,
      account_type: profile.account_type || "PROFESSIONAL",
      access_token_encrypted: encryptMetaToken(accessToken),
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes: ["instagram_business_basic", "instagram_business_content_publish"],
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform,platform_account_id" });
    if (error) {
      console.error("[OAT Social AI] Instagram account save failed:", error.message);
      return finish(request, "storage_error");
    }
    return finish(request, "connected");
  } catch (error) {
    console.error("[OAT Social AI] Instagram OAuth callback failed:", error instanceof Error ? error.message : String(error));
    return finish(request, "connection_error");
  }
}
