import { NextRequest, NextResponse } from "next/server";
import { encryptMetaToken, getSocialAdmin, metaAppId, metaGraphApiVersion, metaRedirectUri, verifyOAuthState } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GraphError = { message?: string; type?: string; code?: number };
type GraphResponse<T> = T & { error?: GraphError };
type TokenResponse = { access_token?: string; token_type?: string; expires_in?: number };
type BusinessResponse = { client_business_id?: string };
type InstagramAccount = { id?: string; username?: string };
type AccountListResponse = { data?: InstagramAccount[] };
type PageListResponse = { data?: Array<{ id?: string; name?: string; instagram_business_account?: InstagramAccount }> };

function finish(request: NextRequest, result: string) {
  const url = new URL("/social/instagram", request.url);
  url.searchParams.set("connection", result);
  const response = NextResponse.redirect(url);
  response.cookies.set("oat_social_ig_state", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/social/instagram", maxAge: 0 });
  return response;
}

async function graphGet<T>(path: string, accessToken: string): Promise<GraphResponse<T>> {
  const url = new URL(\`https://graph.facebook.com/\${metaGraphApiVersion()}/\${path.replace(/^\/+/, "")}\`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const body = await response.json() as GraphResponse<T>;
  if (!response.ok || body.error) {
    console.error("[OAT Social AI] Meta Graph request failed:", {
      endpoint: path.split("?")[0],
      status: response.status,
      code: body.error?.code || null,
      type: body.error?.type || null,
    });
    throw new Error("Meta could not return the requested Instagram assets.");
  }
  return body;
}

async function discoverInstagramAccounts(accessToken: string): Promise<InstagramAccount[]> {
  // Unified Login normally exposes Instagram assets assigned to the selected business.
  try {
    const assigned = await graphGet<AccountListResponse>(
      "me/assigned_instagram_accounts?fields=id,username",
      accessToken,
    );
    const accounts = (assigned.data || []).filter(account => Boolean(account.id));
    if (accounts.length > 0) {
      console.info("[OAT Social AI] Instagram account discovery:", { source: "assigned_instagram_accounts", count: accounts.length });
      return accounts;
    }
    console.warn("[OAT Social AI] Unified Login returned no assigned Instagram accounts; trying linked Facebook Pages.");
  } catch {
    console.warn("[OAT Social AI] Assigned Instagram account lookup failed; trying linked Facebook Pages.");
  }

  // Some Business Login configurations expose the same professional account via its linked Page.
  // Only accept accounts explicitly returned by Meta for a Page in this authorized user's asset list.
  try {
    const pages = await graphGet<PageListResponse>(
      "me/accounts?fields=id,name,instagram_business_account{id,username}",
      accessToken,
    );
    const unique = new Map<string, InstagramAccount>();
    for (const page of pages.data || []) {
      const account = page.instagram_business_account;
      if (account?.id) unique.set(account.id, account);
    }
    const accounts = [...unique.values()];
    console.info("[OAT Social AI] Instagram account discovery:", { source: "linked_facebook_pages", count: accounts.length });
    return accounts;
  } catch {
    return [];
  }
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
    const tokenUrl = new URL(`https://graph.facebook.com/${metaGraphApiVersion()}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", metaRedirectUri(request));
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const token = await tokenResponse.json() as GraphResponse<TokenResponse>;
    if (!tokenResponse.ok || token.error || !token.access_token) {
      console.error("[OAT Social AI] Meta OAuth code exchange failed:", {
        status: tokenResponse.status,
        code: token.error?.code || null,
        type: token.error?.type || null,
      });
      return finish(request, "token_error");
    }

    const business = await graphGet<BusinessResponse>("me?fields=client_business_id", token.access_token);
    if (!business.client_business_id) return finish(request, "business_access_error");

    const accounts = await discoverInstagramAccounts(token.access_token);
    if (accounts.length === 0) return finish(request, "no_instagram_accounts");
    if (accounts.length > 1) return finish(request, "multiple_instagram_accounts");

    const account = accounts[0];
    const admin = getSocialAdmin();
    const { error } = await admin.from("social_platform_accounts").upsert({
      user_id: userId,
      platform: "instagram",
      platform_account_id: account.id,
      account_username: account.username || null,
      account_type: "PROFESSIONAL",
      access_token_encrypted: encryptMetaToken(token.access_token),
      token_expires_at: typeof token.expires_in === "number" ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      // Do not claim permissions that have not been verified from Meta's token response.
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform,platform_account_id" });
    if (error) {
      console.error("[OAT Social AI] Instagram account save failed:", error.message);
      return finish(request, "storage_error");
    }
    return finish(request, "connected");
  } catch (error) {
    console.error("[OAT Social AI] Instagram Unified Login callback failed:", error instanceof Error ? error.message : String(error));
    return finish(request, "connection_error");
  }
}
