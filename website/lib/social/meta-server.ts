import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const SOCIAL_URL = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_URL?.trim() || "";
const SOCIAL_ANON_KEY = process.env.NEXT_PUBLIC_SOCIAL_SUPABASE_ANON_KEY?.trim() || "";

export type SocialUser = { id: string; email?: string };

export async function requireSocialUser(request: NextRequest): Promise<SocialUser | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token || !SOCIAL_URL || !SOCIAL_ANON_KEY) return null;
  try {
    const response = await fetch(`${SOCIAL_URL.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { apikey: SOCIAL_ANON_KEY, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const user = await response.json() as { id?: string; email?: string };
    return user.id ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

export function getSocialAdmin(): SupabaseClient {
  const serviceKey = process.env.SOCIAL_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SOCIAL_SUPABASE_SECRET_KEY?.trim();
  if (!SOCIAL_URL || !serviceKey) throw new Error("Social account storage is not configured.");
  return createClient(SOCIAL_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function encryptionKey(): Buffer {
  const raw = process.env.SOCIAL_META_TOKEN_ENCRYPTION_KEY?.trim() || "";
  let key: Buffer;
  try { key = Buffer.from(raw, "base64"); } catch { key = Buffer.alloc(0); }
  if (key.length !== 32) throw new Error("Instagram token encryption is not configured with a 32-byte base64 key.");
  return key;
}

export function encryptMetaToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString("base64url")).join(".");
}

export function decryptMetaToken(value: string): string {
  const [ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Stored Instagram token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64url")), decipher.final()]).toString("utf8");
}

function stateSecret(): string {
  const secret = process.env.SOCIAL_META_APP_SECRET?.trim() || "";
  if (secret.length < 20) throw new Error("Meta app secret is not configured.");
  return secret;
}

export function createOAuthState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, nonce: randomBytes(24).toString("base64url"), exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string, expectedState: string): string | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !expectedState) return null;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string; exp?: number };
    return parsed.userId && typeof parsed.exp === "number" && parsed.exp > Date.now() ? parsed.userId : null;
  } catch {
    return null;
  }
}

export function metaAppId(): string {
  return process.env.SOCIAL_META_APP_ID?.trim() || "";
}

export function metaRedirectUri(request: NextRequest): string {
  return process.env.SOCIAL_META_REDIRECT_URI?.trim() || new URL("/api/social/instagram/callback", request.url).toString();
}
