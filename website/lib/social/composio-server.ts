import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

const API_BASE = "https://backend.composio.dev/api/v3";

export function composioConfigured(): boolean {
  return Boolean(
    process.env.COMPOSIO_API_KEY?.trim() &&
    process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID?.trim()
  );
}

function apiKey(): string {
  const value = process.env.COMPOSIO_API_KEY?.trim();
  if (!value) throw new Error("Composio is not configured.");
  return value;
}

export function createComposioState(userId: string): string {
  return userId + "." + randomBytes(32).toString("base64url");
}

export function verifyComposioState(cookieValue: string, queryValue: string): boolean {
  if (!cookieValue || !queryValue) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(queryValue);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function composioRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(API_BASE + path, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) {
    console.error("[OAT Social AI] Composio API error:", {
      path,
      status: response.status,
      message: body.message || body.error || "Unknown Composio error",
    });
    throw new Error("Composio could not complete the Instagram request. Check the Composio project and Instagram auth configuration.");
  }
  return body;
}

export function instagramAuthConfigId(): string {
  const value = process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID?.trim();
  if (!value) throw new Error("Instagram auth configuration is missing.");
  return value;
}
