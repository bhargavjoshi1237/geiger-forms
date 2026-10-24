import { cronAuthError, ok, unavailable } from "@/lib/server/http";
import { sweepWebhooks } from "@/lib/server/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Daily: retries webhook deliveries that are due and drops stored payloads past the 30-day replay window.
export async function GET(request) {
  const authError = cronAuthError(request);
  if (authError) return authError;
  const result = await sweepWebhooks();
  return result ? ok(result) : unavailable();
}
