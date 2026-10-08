import { cronAuthError, fail, ok, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { responseFilePaths } from "@/lib/server/forms";
import { removePaths } from "@/lib/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Daily: deletes expired responses' files, then hard-deletes rows past each form's retentionDays.
export async function GET(request) {
  const authError = cronAuthError(request);
  if (authError) return authError;
  const db = formsAdmin();
  if (!db) return unavailable();

  const { data: forms, error } = await db.from("forms").select("id, retention:settings->>retentionDays").not("settings->>retentionDays", "is", null);
  if (error) {
    console.error("[cron.retention]", error.message);
    return fail("Couldn't load forms.", 500);
  }
  let files = 0;
  for (const form of forms || []) {
    const days = Number(form.retention);
    if (!Number.isInteger(days) || days <= 0) continue;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data: expired } = await db.from("responses").select("answers, metadata").eq("form_id", form.id).lt("submitted_at", cutoff).limit(2000);
    files += await removePaths((expired || []).flatMap(responseFilePaths));
  }

  const { data: purged, error: rpcError } = await db.rpc("purge_expired_responses");
  if (rpcError) {
    console.error("[cron.retention.purge]", rpcError.message);
    return fail("Purge failed.", 500);
  }
  return ok({ purged: purged ?? 0, files });
}
