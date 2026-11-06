import { NextRequest, NextResponse } from "next/server";
import { composioRequest, verifyComposioState } from "@/lib/social/composio-server";
import { getSocialAdmin } from "@/lib/social/meta-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConnectedAccount = {
  id?: string;
  user_id?: string;
  status?: string;
  toolkit?: { slug?: string };
  data?: Record<string, unknown> | null;
};

function finish(request: NextRequest, result: string) {
  const url = new URL("/social/instagram", request.url);
  url.searchParams.set("connection", result);
  const response = NextResponse.redirect(url);
  response.cookies.set("oat_composio_ig_state", "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/api/social/instagram", maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") || "";
  const cookieState = request.cookies.get("oat_composio_ig_state")?.value || "";
  if (!verifyComposioState(cookieState, state)) return finish(request, "invalid_state");

  const status = request.nextUrl.searchParams.get("status");
  const connectedAccountId = request.nextUrl.searchParams.get("connected_account_id") || "";
  if (status !== "success" || !connectedAccountId) return finish(request, "cancelled");

  try {
    const account = await composioRequest<ConnectedAccount>(
      "/connected_accounts/" + encodeURIComponent(connectedAccountId)
    );
    if (
      account.id !== connectedAccountId ||
      account.toolkit?.slug?.toLowerCase() !== "instagram" ||
      account.status !== "ACTIVE" ||
      !account.user_id
    ) return finish(request, "account_not_active");

    const admin = getSocialAdmin();
    const { error } = await admin.from("social_platform_accounts").upsert({
      user_id: account.user_id,
      platform: "instagram",
      platform_account_id: connectedAccountId,
      composio_connected_account_id: connectedAccountId,
      account_username: typeof account.data?.username === "string" ? account.data.username : null,
      account_type: "PROFESSIONAL",
      access_token_encrypted: null,
      token_expires_at: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform,platform_account_id" });
    if (error) {
      console.error("[OAT Social AI] Could not save Composio Instagram connection:", error.message);
      return finish(request, "storage_error");
    }
    return finish(request, "connected");
  } catch (error) {
    console.error("[OAT Social AI] Composio Instagram callback failed:", error instanceof Error ? error.message : String(error));
    return finish(request, "connection_error");
  }
}
