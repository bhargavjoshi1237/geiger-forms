import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for server routes only (bypasses RLS). Never import from client code.
let cached = null;

export function isAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function adminClient() {
  if (!isAdminConfigured()) return null;
  if (!cached) {
    cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

// Service-role client pinned to the `forms` schema.
export function formsAdmin() {
  return adminClient()?.schema("forms") ?? null;
}
