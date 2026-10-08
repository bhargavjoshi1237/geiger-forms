import { appOrigin, cronAuthError, ok, unavailable, workspaceUrl } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { toServerForm } from "@/lib/server/forms";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/server/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function countEvents(db, formId, type, since) {
  const { count } = await db.from("form_events").select("id", { count: "exact", head: true }).eq("form_id", formId).eq("type", type).gte("created_at", since);
  return count ?? 0;
}

// Weekly digest (runs daily; sends on Mondays UTC, or any day with ?force=1) to each form's reportEmails.
export async function GET(request) {
  const authError = cronAuthError(request);
  if (authError) return authError;
  const db = formsAdmin();
  if (!db) return unavailable();
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && new Date().getUTCDay() !== 1) return ok({ sent: 0, skipped: "not Monday" });
  if (!isEmailConfigured()) return ok({ sent: 0, skipped: "RESEND_API_KEY missing" });

  const { data: rows, error } = await db.from("forms").select("*").is("deleted_at", null).neq("status", "Archived").not("settings->reportEmails", "is", null);
  if (error) console.error("[cron.reports]", error.message);
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const origin = appOrigin(request);
  let sent = 0;
  for (const row of rows || []) {
    const form = toServerForm(row);
    const to = (form.settings.reportEmails || []).filter(Boolean);
    if (!to.length) continue;
    const [{ data: responses }, views, starts] = await Promise.all([
      db.from("responses").select("status, priority").eq("form_id", form.id).is("deleted_at", null).gte("submitted_at", since).limit(10000),
      countEvents(db, form.id, "view", since),
      countEvents(db, form.id, "start", since),
    ]);
    const list = responses || [];
    const byStatus = {};
    for (const r of list) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    const high = list.filter((r) => r.priority === "High").length;
    const reportRows = [
      { label: "Responses", value: String(list.length) },
      { label: "Views", value: String(views) },
      { label: "Starts", value: String(starts) },
      { label: "Completion rate", value: starts ? `${Math.round((list.length / starts) * 100)}%` : "—" },
      { label: "High priority", value: String(high) },
      ...Object.entries(byStatus).map(([status, n]) => ({ label: status, value: String(n) })),
    ];
    const text = `Here's how "${form.title}" did over the last 7 days.`;
    const link = workspaceUrl(origin, form);
    const result = await sendEmail({
      to,
      subject: `Weekly report: ${form.title}`,
      text: `${text}\n\n${reportRows.map((r) => `${r.label}: ${r.value}`).join("\n")}\n\n${link}`,
      html: renderEmail({ heading: `Weekly report: ${form.title}`, text, rows: reportRows, cta: { url: link, label: "Open responses" } }),
    });
    if (result.sent) sent += 1;
  }
  return ok({ sent });
}
