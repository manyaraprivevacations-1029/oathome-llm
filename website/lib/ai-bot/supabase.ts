import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/ai-bot/database.types";

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getUrl() && getServiceKey());
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  const url = getUrl();
  const key = getServiceKey();

  if (!url || !key) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseWorkspaceId(): string | null {
  return process.env.AI_BOT_WORKSPACE_ID?.trim() || null;
}
