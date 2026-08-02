import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// Pre-scoped browser client pinned to this product's dedicated `forms` schema
// (per SUPABASE_CONVENTIONS). Data files call schemaClient() so every
// .from("<table>") resolves inside forms.* — no schema prefix in the string.
// The shared public tables (flow_projects, auth.users) are read through a plain
// createClient() instead.
export { isSupabaseConfigured };

export function schemaClient() {
  return createClient().schema("forms");
}
