import { NextRequest, NextResponse } from "next/server";
import { composioConfigured, composioRequest } from "@/lib/social/composio-server";
import { getSocialAdmin, requireSocialUser } from "@/lib/social/meta-server";
import { formatPublicPost } from "@/lib/social/caption-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProxyResponse = { status?: number; data?: Record<string, unknown> };
function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
function responseData(response: ProxyResponse): Record<string, unknown> {
  const value = response.data || {};
  return value.data && typeof value.data === "object" && !Array.isArray(value.data)
    ? value.data as Record<string, unknown> : value;
}
function remoteError(response: ProxyResponse): string | null {
  const value = responseData(response);
  const detail = value.error;
  const message = detail && typeof detail === "object" && "message" in detail
    ? String((detail as { message?: unknown }).message || "")
    : typeof detail === "string" ? detail : "";
  return message || (response.status && response.status >= 400 ? "Instagram rejected the request." : null);
}
async function instagramProxy(accountId: string, userId: string, endpoint: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  return composioRequest<ProxyResponse>("/tools/execute/proxy", {
    method: "POST",
    body: JSON.stringify({
      connected_account_id: accountId, user_id: userId, endpoint, method,
      ...(body ? { body } : {}),
    }),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireSocialUser(request);
  if (!user) return errorResponse("Your session expired. Please sign in again.", 401);
  if (!composioConfigured()) return errorResponse("Instagram is not configured. Open Accounts to connect it.", 503);

  let id: unknown;
  try { ({ creationId: id } = await request.json()); } catch { return errorResponse("Invalid publishing request.", 400); }
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return errorResponse("Save the post before publishing.", 400);

  try {
    const admin = getSocialAdmin();
    const { data: creation, error: readError } = await admin.from("social_content_items")
      .select("id,user_id,content_type,status,caption,asset_path,metadata,deleted_at")
      .eq("id", id).eq("user_id", user.id).single();
    if (readError || !creation) return errorResponse("Saved post not found.", 404);
    if (creation.deleted_at) return errorResponse("Restore the deleted post before publishing.", 409);
    if (creation.content_type !== "post") return errorResponse("Only single-image Instagram posts are supported here.", 400);
    if (creation.status === "published") return errorResponse("This post is already marked as published.", 409);
    if (creation.status === "scheduled") return errorResponse("This post is scheduled; publishing is blocked to avoid duplicates.", 409);
    const path = creation.asset_path;
    if (typeof path !== "string" || !path.startsWith(user.id + "/") || !/\.jpe?g$/i.test(path))
      return errorResponse("Upload a JPEG image, save the post and then publish. Instagram requires JPEG for this publishing flow.", 400);

    const { data: account, error: accountError } = await admin.from("social_platform_accounts")
      .select("composio_connected_account_id").eq("user_id", user.id).eq("platform", "instagram")
      .order("connected_at", { ascending: false }).limit(1).maybeSingle();
    if (accountError) throw accountError;
    if (!account?.composio_connected_account_id) return errorResponse("Instagram is not connected. Open Accounts and authorize Instagram first.", 409);

    const connectedAccountId = account.composio_connected_account_id;
    const remote = await composioRequest<{ id?: string; user_id?: string; status?: string; toolkit?: { slug?: string } }>(
      "/connected_accounts/" + encodeURIComponent(connectedAccountId)
    );
    if (remote.id !== connectedAccountId || remote.user_id !== user.id ||
        remote.status !== "ACTIVE" || remote.toolkit?.slug?.toLowerCase() !== "instagram")
      return errorResponse("Your Instagram connection is not active. Reconnect it from Accounts.", 409);

    const { data: signed, error: signedError } = await admin.storage.from("social-creation-images").createSignedUrl(path, 1800);
    if (signedError || !signed?.signedUrl) return errorResponse("Could not prepare the saved image for Instagram.", 502);
    // Signed HTTPS URL permits Meta to retrieve the image for the next 30 minutes;
    // the storage bucket remains private to the owner at all other times.
    if (!signed.signedUrl.startsWith("https://")) return errorResponse("Image hosting must use HTTPS.", 502);

    const profileResponse = await instagramProxy(connectedAccountId, user.id, "/me?fields=id,username,account_type", "GET");
    if (remoteError(profileResponse)) return errorResponse("Unable to read your Instagram profile. Check account permissions in Composio.", 502);
    const profile = responseData(profileResponse);
    const igId = profile.id;
    if (typeof igId !== "string" || !/^\d+$/.test(igId))
      return errorResponse("Instagram did not provide a professional account ID. Reconnect a Business or Creator account.", 409);

    const metadata = creation.metadata && typeof creation.metadata === "object" ? creation.metadata as Record<string, unknown> : {};
    const caption = formatPublicPost(String(creation.caption || ""), String(metadata.hashtags || "")).fullCaption.slice(0, 2200);
    if (!caption) return errorResponse("The saved post has no caption.", 400);

    // Preserve a media container across attempts. Do not create another if Instagram
    // already accepted one but could not confirm publication.
    let containerId = typeof metadata.instagram_pending_container_id === "string"
      ? metadata.instagram_pending_container_id : null;
    if (!containerId) {
      const containerResponse = await instagramProxy(connectedAccountId, user.id, "/" + igId + "/media", "POST",
        { image_url: signed.signedUrl, caption });
      const container = responseData(containerResponse);
      if (remoteError(containerResponse) || typeof container.id !== "string") {
        const problem = container.error && typeof container.error === "object"
          ? container.error as Record<string, unknown> : {};
        console.error("[OAT Social AI] Instagram container create rejected", {
          status: containerResponse.status, code: problem.code, subcode: problem.error_subcode
        });
        return errorResponse("Instagram could not prepare the image. Check its permissions, dimensions and account connection.", 502);
      }
      containerId = container.id;
      const { error: pendingError } = await admin.from("social_content_items")
        .update({ metadata: { ...metadata, instagram_pending_container_id: containerId } })
        .eq("id", id).eq("user_id", user.id);
      if (pendingError) {
        console.error("[OAT Social AI] Could not persist pending Instagram container", { creationId: id });
        return errorResponse("The image was prepared, but its reference could not be saved. Check Instagram and your Creations record before trying again.", 502);
      }
    }

    // Meta processes photo uploads asynchronously. Only FINISHED is safe to publish.
    // Bounded read-only checks; never submit publication until the container is ready.
    let containerState = "";
    let containerDetails = "";
    for (let check = 0; check < 5; check++) {
      const statusResponse = await instagramProxy(connectedAccountId, user.id,
        "/" + encodeURIComponent(containerId) + "?fields=status_code,status", "GET");
      const status = responseData(statusResponse);
      if (remoteError(statusResponse)) {
        console.error("[OAT Social AI] Could not read container readiness", { status: statusResponse.status });
        return errorResponse("Instagram has the image, but its readiness could not be checked. Your draft is saved; try publishing the same draft again later.", 502);
      }
      containerState = String(status.status_code || "").toUpperCase();
      containerDetails = String(status.status || "");
      if (containerState !== "IN_PROGRESS" && containerState !== "PENDING") break;
      if (check < 4) await new Promise(resolve => setTimeout(resolve, 3500));
    }
    if (containerState === "PUBLISHED")
      return errorResponse("Instagram reports this photo container is already published. Check your Instagram profile before trying another post.", 409);
    if (containerState === "ERROR" || containerState === "EXPIRED") {
      console.error("[OAT Social AI] Instagram container failed", { state: containerState, detail: containerDetails.slice(0, 160) });
      return errorResponse("Instagram could not process this image (" + containerState + "). Check the photo and your Instagram account.", 422);
    }
    if (containerState !== "FINISHED")
      return errorResponse("Instagram is still processing your image. Your creation is saved. Wait a little and select Publish again to continue the same upload.", 409);

    // Exactly one publish call per explicit user action. Failed/unconfirmed responses
    // never trigger automatic retries, since the photo could already be live.
    const publishResponse = await instagramProxy(connectedAccountId, user.id, "/" + igId + "/media_publish", "POST",
      { creation_id: containerId });
    const published = responseData(publishResponse);
    if (remoteError(publishResponse) || typeof published.id !== "string") {
      const issue = published.error && typeof published.error === "object"
        ? published.error as Record<string, unknown> : {};
      console.error("[OAT Social AI] Instagram publish rejected", {
        creationId: id, status: publishResponse.status,
        code: issue.code, subcode: issue.error_subcode,
        reason: String(issue.message || "").slice(0, 200)
      });
      return errorResponse("Instagram rejected publication (HTTP " + (publishResponse.status || 400)
        + (issue.code !== undefined ? ", code " + String(issue.code) : "")
        + (issue.error_subcode !== undefined ? "/" + String(issue.error_subcode) : "")
        + "). Your upload is saved. Check Instagram before another attempt.", 502);
    }

    // Best-effort permalink lookup. Publishing success does not depend on this read.
    let permalink: string | null = null;
    try {
      const linkResponse = await instagramProxy(connectedAccountId, user.id, "/" + published.id + "?fields=permalink", "GET");
      const linkData = responseData(linkResponse);
      if (typeof linkData.permalink === "string" && linkData.permalink.startsWith("https://www.instagram.com/")) permalink = linkData.permalink;
    } catch { /* the media ID is sufficient to confirm publishing */ }

    const { error: writeError } = await admin.from("social_content_items")
      .update({ status: "published", published_at: new Date().toISOString(),
        metadata: { ...metadata, instagram_media_id: published.id, ...(permalink ? { instagram_permalink: permalink } : {}), instagram_published_at: new Date().toISOString() } })
      .eq("id", id).eq("user_id", user.id);
    if (writeError) console.error("[OAT Social AI] Published successfully but saving post state failed", { creationId: id });
    return NextResponse.json({ published: true, mediaId: published.id, permalink,
      warning: writeError ? "Instagram confirmed publishing, but the saved record could not be updated." : null },
      { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[OAT Social AI] Instagram publish failed", e instanceof Error ? e.message : "unknown");
    return errorResponse("Instagram publishing could not be completed. Check connection and permissions; confirm the post is not already live before retrying.", 502);
  }
}
