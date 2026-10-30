import { createClient } from "@supabase/supabase-js";
import { supabaseIssuer } from "./config";

// Kept at module level so the signing keys stay cached between requests.
let verifier = null;

function tokenVerifier() {
  if (!verifier) {
    verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return verifier;
}

// Checks signature, expiry and issuer, and requires client_id so a plain browser session token is refused.
export async function verifyMcpToken(_request, token, { getClaims, issuer = supabaseIssuer() } = {}) {
  if (!token) return undefined;
  const read = getClaims ?? ((value) => tokenVerifier().auth.getClaims(value));
  const { data, error } = await read(token);
  const claims = data?.claims;
  if (error || !claims) return undefined;
  if (claims.iss !== issuer || claims.role !== "authenticated" || !claims.sub || !claims.client_id) return undefined;
  const meta = claims.user_metadata ?? {};
  return {
    token,
    clientId: String(claims.client_id),
    scopes: [],
    expiresAt: claims.exp,
    extra: { userId: claims.sub, name: meta.full_name || meta.name || String(claims.email || "").split("@")[0] || "User" },
  };
}
