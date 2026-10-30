import { appOrigin, cronAuthError, formUrl, ok, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { interpolate, sensitiveIdentity } from "@/lib/forms/logic";
import { mergeResponseMeta, respondentContact, safeAnswers, toServerForm } from "@/lib/server/forms";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/server/email";
import { bookingConfig } from "@/lib/server/booking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOUR = 3_600_000;

function slotLabel(iso, timeZone) {
  return new Date(iso).toLocaleString("en-US", { timeZone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

// Booking reminders for slots starting within 24h.
async function sendBookingReminders(db, origin) {
  const now = Date.now();
  const { data, error } = await db
    .from("bookings")
    .select("id, form_id, field_id, slot_start, email, forms(title, slug, schema, deleted_at)")
    .is("reminded_at", null)
    .is("deleted_at", null)
    .not("email", "is", null)
    .gte("slot_start", new Date(now).toISOString())
    .lte("slot_start", new Date(now + 24 * HOUR).toISOString())
    .limit(500);
  if (error) console.error("[cron.reminders.bookings]", error.message);
  let sent = 0;
  for (const b of data || []) {
    if (!b.forms || b.forms.deleted_at) continue;
    const field = (b.forms.schema?.fields || []).find((f) => f.id === b.field_id);
    const when = slotLabel(b.slot_start, bookingConfig(field).timezone);
    const text = `This is a reminder of your booking for "${b.forms.title}" on ${when}.`;
    const result = await sendEmail({
      to: b.email,
      subject: `Reminder: ${b.forms.title} — ${when}`,
      text: `${text}\n\n${formUrl(origin, b.forms.slug)}`,
      html: renderEmail({ heading: "Upcoming booking", text }),
    });
    if (result.sent) {
      sent += 1;
      await db.from("bookings").update({ reminded_at: new Date().toISOString() }).eq("id", b.id);
    }
  }
  return sent;
}

// Drip follow-ups: each followUp fires once per response after delayHours (within a 7-day catch-up window).
async function sendFollowUps(db) {
  const { data: rows, error } = await db.from("forms").select("*").eq("status", "Published").is("deleted_at", null).not("settings->followUps", "is", null);
  if (error) console.error("[cron.reminders.forms]", error.message);
  const now = Date.now();
  let sent = 0;
  for (const row of rows || []) {
    const form = toServerForm(row);
    const followUps = (form.settings.followUps || []).filter((f) => f && f.id && (f.subject || f.body));
    if (!followUps.length) continue;
    const delays = followUps.map((f) => Math.max(0, Number(f.delayHours) || 0));
    let query = db
      .from("responses")
      .select("id, answers, metadata, respondent_email, submitted_at")
      .eq("form_id", form.id)
      .is("deleted_at", null)
      .neq("status", "Spam")
      .gte("submitted_at", new Date(now - (Math.max(...delays) + 168) * HOUR).toISOString())
      .lte("submitted_at", new Date(now - Math.min(...delays) * HOUR).toISOString());
    // A sensitive email answer leaves the column empty, so those rows are resolved one by one below.
    if (!sensitiveIdentity(form.fieldDefs).email) query = query.not("respondent_email", "is", null);
    const { data: responses } = await query.limit(1000);
    for (const r of responses || []) {
      const to = respondentContact(r, form);
      if (!to) continue;
      const done = new Set(r.metadata?.followUpsSent || []);
      const age = now - Date.parse(r.submitted_at);
      const answers = safeAnswers(r, form, "[protected]");
      const newlySent = [];
      for (const f of followUps) {
        const delay = Math.max(0, Number(f.delayHours) || 0) * HOUR;
        if (done.has(f.id) || age < delay || age > delay + 168 * HOUR) continue;
        const subject = interpolate(f.subject, form, answers) || `Following up: ${form.title}`;
        const text = interpolate(f.body, form, answers);
        const result = await sendEmail({ to, subject, text, html: renderEmail({ heading: form.title, text }) });
        if (result.sent) newlySent.push(f.id);
      }
      if (newlySent.length) {
        sent += newlySent.length;
        await mergeResponseMeta(r.id, { followUpsSent: [...done, ...newlySent] });
      }
    }
  }
  return sent;
}

export async function GET(request) {
  const authError = cronAuthError(request);
  if (authError) return authError;
  const db = formsAdmin();
  if (!db) return unavailable();
  if (!isEmailConfigured()) return ok({ reminders: 0, followUps: 0, skipped: "RESEND_API_KEY missing" });
  const reminders = await sendBookingReminders(db, appOrigin(request));
  const followUps = await sendFollowUps(db);
  return ok({ reminders, followUps });
}
