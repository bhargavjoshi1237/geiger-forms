import "server-only";
import { randomBytes } from "node:crypto";
import { loadForm } from "@/lib/server/forms";
import { signReportToken, verifyReportToken } from "@/lib/server/crypto";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { sharedReport } from "@/lib/forms/survey-analytics";

// Public survey report links. The nonce lives in forms.metadata, which respondents' payloads never include and the builder never rewrites.

const MAX_REPORT_ROWS = 5000;

export function shareUrl(origin, form) {
  const nonce = form.metadata?.reportShare?.nonce;
  const token = nonce ? signReportToken(form.id, nonce) : null;
  // Under /form/ because the suite hub already routes that path publicly.
  return token ? `${origin}/form/report/${token}` : null;
}

async function writeShare(form, reportShare) {
  const metadata = { ...(form.metadata || {}), reportShare };
  const { error } = await formsAdmin().from("forms").update({ metadata }).eq("id", form.id);
  if (error) {
    console.error("[report-share.write]", error.message);
    return null;
  }
  return { ...form, metadata };
}

// Turns sharing on, or replaces the link so the old one stops working.
export const enableShare = (form) => writeShare(form, { nonce: randomBytes(16).toString("hex"), createdAt: new Date().toISOString() });
export const disableShare = (form) => writeShare(form, null);

// The report behind a token: its publishable aggregates, or null for any invalid, revoked or deleted link.
export async function loadSharedReport(token) {
  const claim = verifyReportToken(token);
  if (!claim) return null;
  const form = await loadForm({ id: claim.formId });
  if (!form || form.deletedAt || form.metadata?.reportShare?.nonce !== claim.nonce) return null;
  const { data, error } = await formsAdmin()
    .from("responses")
    .select("answers, submitted_at")
    .eq("form_id", form.id)
    .is("deleted_at", null)
    .neq("status", "Spam")
    .order("submitted_at", { ascending: false })
    .limit(MAX_REPORT_ROWS);
  if (error) {
    console.error("[report-share.load]", error.message);
    return null;
  }
  return sharedReport(form, (data || []).map((r) => ({ answers: r.answers, submittedAt: r.submitted_at })));
}
