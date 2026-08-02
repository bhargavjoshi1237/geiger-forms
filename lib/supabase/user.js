// Current signed-in user accessor. Reads the shared suite session (the
// `sb-<ref>-auth-token` cookie written by @supabase/ssr) via getSession() and
// maps it to a small camelCase view model. No login lives in this app — it
// consumes whatever session the parent project already established.
import { createClient, isSupabaseConfigured } from "./client";

let _cached = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 30 * 1000;

function parseSession(session) {
  if (!session?.user) return null;

  const meta = session.user.user_metadata ?? {};
  const email = session.user.email ?? "";

  return {
    id: session.user.id,
    name: meta.full_name || meta.name || email.split("@")[0] || "User",
    email,
    avatar: meta.avatar_url || null,
  };
}

export async function getUser() {
  // No Supabase env → treat as signed-out rather than crashing the caller
  if (!isSupabaseConfigured()) return null;

  const now = Date.now();
  if (_cached && now - _cacheTimestamp < CACHE_TTL) {
    return _cached;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = parseSession(session);

  _cached = user;
  _cacheTimestamp = now;

  return user;
}

export function getUserCached() {
  return _cached;
}

export function invalidateUserCache() {
  _cached = null;
  _cacheTimestamp = 0;
}
