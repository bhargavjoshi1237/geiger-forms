import "server-only";
import { adminClient } from "@/lib/server/supabase-admin";
import { pendingApprovers } from "@/lib/forms/approvals";
import { interpolate, matchesConditions } from "@/lib/forms/logic";
import { RESPONSE_PRIORITIES, RESPONSE_STATUSES } from "@/lib/forms/schema";
import { answersText, labelledAnswers, logActivity, mergeResponseMeta, respondentContact, respondentLabel, safeAnswers, safeRespondent } from "@/lib/server/forms";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/server/email";
import { responsePdfAttachment } from "@/lib/server/response-pdf";
import { dispatchEvent, postSlack, queueWebhook, responsePayload } from "@/lib/server/webhooks";
import { createFlowIssue, notifyAssignment, notifyFlowUsers, shouldEscalate } from "@/lib/server/flow";
import { findProjectMember } from "@/lib/server/auth";
import { syncContact } from "@/lib/server/suite-records";
import { isEmail, workspaceUrl } from "@/lib/server/http";

// Post-submission side effects. Each one is isolated: a failure is logged and never fails the submission.

function splitEmails(value) {
  return (Array.isArray(value) ? value : String(value || "").split(/[,;\s]+/)).map((e) => String(e).trim()).filter(isEmail);
}

// Sends with the response PDF attached; a failed render, or an attachment Resend rejects, still delivers the plain email.
async function sendWithPdf(message, pdf) {
  const attachment = isEmailConfigured() ? await responsePdfAttachment(pdf) : null;
  if (!attachment) return sendEmail(message);
  const result = await sendEmail({ ...message, attachments: [attachment] });
  return !result.sent && /^resend_4(?!29)/.test(result.error || "") ? sendEmail(message) : result;
}

export async function sendConfirmation({ form, row, answers, extras, editUrl }) {
  const s = form.settings;
  const to = s.confirmEmail ? respondentContact(row, form) : null;
  if (!to) return null;
  const subject = interpolate(s.confirmSubject, form, answers, extras) || `Thanks for completing ${form.title}`;
  const text = interpolate(s.confirmBody, form, answers, extras);
  const rows = labelledAnswers(form, answers);
  const message = {
    to,
    subject,
    text: `${text}\n\n${answersText(rows)}${editUrl ? `\n\nEdit your response: ${editUrl}` : ""}`,
    html: renderEmail({ heading: form.title, text, rows, cta: editUrl ? { url: editUrl, label: "Edit your response" } : null }),
  };
  return s.confirmAttachPdf ? sendWithPdf(message, { form, row, audience: "external" }) : sendEmail(message);
}

export async function sendAdminNotification({ form, row, answers, origin, to }) {
  const recipients = splitEmails(to ?? form.settings.notifyEmails);
  if (!recipients.length) return null;
  const rows = labelledAnswers(form, answers);
  const link = workspaceUrl(origin, form, row.id);
  const who = respondentLabel(row, form, "Someone");
  const summary = `${who} submitted ${form.title}.${row.score != null ? ` Score ${row.score}, ${row.priority} priority.` : ""}`;
  const message = {
    to: recipients,
    subject: `New response: ${form.title}`,
    text: `${summary}\n\n${answersText(rows)}\n\nOpen in Geiger Forms: ${link}`,
    html: renderEmail({ heading: `New response: ${form.title}`, text: summary, rows, cta: { url: link, label: "Open response" } }),
    replyTo: safeRespondent(row, form).email || undefined,
  };
  // Automation emails (`to` set) can go to any address, so only the form's team list gets the attachment.
  return form.settings.notifyAttachPdf && !to ? sendWithPdf(message, { form, row, audience: "workspace" }) : sendEmail(message);
}

export async function sendSlack({ form, row, answers, origin }) {
  const url = form.settings.slackWebhookUrl;
  if (!url) return null;
  const rows = labelledAnswers(form, answers).slice(0, 12);
  const who = respondentLabel(row, form, "Someone");
  const text = `*New response to ${form.title}* from ${who}${row.priority === "High" ? " :rotating_light: High priority" : ""}\n${rows
    .map((r) => `• *${r.label}:* ${String(r.value).slice(0, 300)}`)
    .join("\n")}\n<${workspaceUrl(origin, form, row.id)}|Open in Geiger Forms>`;
  return postSlack(url, text);
}

// Emails the approvers of the current approval step.
export async function sendApprovalRequest({ form, row, origin, reminder = false }) {
  const steps = form.settings.approval?.steps || [];
  const step = steps[row.approval?.stepIndex ?? 0];
  // A reminder only chases people who haven't voted yet.
  const recipients = reminder ? pendingApprovers(step, row.approval) : splitEmails(step?.approvers);
  if (!step || !recipients.length) return null;
  const link = workspaceUrl(origin, form, row.id);
  const who = respondentLabel(row, form, "A respondent");
  const text = `${who}'s response to ${form.title} is ${reminder ? "still " : ""}waiting for your approval (step ${(row.approval?.stepIndex ?? 0) + 1} of ${steps.length}: ${step.name || "Approval"}).`;
  const hidden = new Set(step.hiddenFields || []);
  const answers = Object.fromEntries(Object.entries(row.answers || {}).filter(([id]) => !hidden.has(id)));
  return sendEmail({
    to: recipients,
    subject: `${reminder ? "Reminder: approval" : "Approval"} needed: ${form.title}`,
    text: `${text}\n\nReview it: ${link}`,
    html: renderEmail({ heading: reminder ? "Approval still needed" : "Approval needed", text, rows: labelledAnswers(form, answers), cta: { url: link, label: "Review response" } }),
  });
}

// Tells the respondent the final approval decision.
export async function sendDecision({ form, row, decision, note }) {
  const to = respondentContact(row, form);
  if (!to) return null;
  const approved = decision === "approve";
  const text = `Your response to ${form.title} has been ${approved ? "approved" : "declined"}.${note ? `\n\nNote from the reviewer: ${note}` : ""}`;
  return sendEmail({
    to,
    subject: `${form.title}: ${approved ? "approved" : "declined"}`,
    text,
    html: renderEmail({ heading: approved ? "Approved" : "Declined", text }),
  });
}

// Copies uploaded files into Geiger Assets (assets.assets rows pointing at the forms-uploads bucket).
export async function syncAssets({ form, row, files }) {
  if (!form.settings.assets?.sync || !files?.length) return null;
  const admin = adminClient();
  if (!admin) return null;
  const typeOf = (mime, name) => {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
    if (/zip|tar|gzip|compressed/.test(mime)) return "archive";
    return "document";
  };
  const rows = files.map((f) => ({
    project_id: form.projectId,
    name: String(f.name || "Upload").slice(0, 250),
    type: typeOf(String(f.type || ""), String(f.name || "")),
    format: String(f.name || "").split(".").pop()?.toLowerCase().slice(0, 12) || "",
    size_bytes: Math.max(0, Number(f.size) || 0),
    storage_bucket: "forms-uploads",
    storage_key: f.path,
    mime_type: String(f.type || ""),
    status: "review",
    tags: ["forms"],
    description: `Uploaded via ${form.title}`.slice(0, 500),
    metadata: { source: "geiger-forms", formId: form.id, responseId: row.id, fieldId: f.fieldId },
  }));
  const { error } = await admin.schema("assets").from("assets").insert(rows);
  if (error) console.error("[effects.assets]", error.message);
  return !error;
}

// Runs matching automations, applies their row patch, and returns the updated row.
export async function runAutomations({ form, row, answers, origin }) {
  const list = (form.settings.automations || []).filter((a) => a && a.enabled !== false && Array.isArray(a.actions) && a.actions.length);
  const patch = {};
  const tags = new Set(row.tags || []);
  const ran = [];
  const tasks = [];
  let escalate = false;
  for (const automation of list) {
    if (!matchesConditions(automation.conditions, automation.logic || automation.conditionLogic, answers)) continue;
    ran.push(automation.id);
    for (const action of automation.actions) {
      const value = action?.value;
      switch (action?.type) {
        case "set_status":
          // Never let an automation skip payment.
          if (RESPONSE_STATUSES.includes(value) && row.status !== "Awaiting payment") patch.status = value;
          break;
        case "set_priority":
          if (RESPONSE_PRIORITIES.includes(value)) patch.priority = value;
          break;
        case "add_tag":
          if (value) String(value).split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => tags.add(t.slice(0, 60)));
          break;
        case "assign":
          // The value is a teammate's email or name; it stays a name-only snapshot when no project member matches.
          if (value) {
            const member = await findProjectMember(form, value);
            patch.assignee_id = member?.id ?? null;
            patch.assignee = member?.name ?? String(value).slice(0, 200);
          }
          break;
        case "email":
          tasks.push(() => sendAdminNotification({ form, row: { ...row, ...patch }, answers, origin, to: value }));
          break;
        case "flow_issue":
          escalate = true;
          break;
        case "webhook":
          if (value) {
            tasks.push(() => queueWebhook({ form, automation, url: value, event: "response.created", payload: responsePayload(form, row, safeAnswers(row, form, "[protected]")), responseId: row.id }));
          }
          break;
        default:
          break;
      }
    }
  }
  if (!ran.length) return { row, escalate };
  if (tags.size !== (row.tags || []).length) patch.tags = [...tags];
  if (patch.assignee_id) tasks.push(() => notifyAssignment({ form, rows: [row], assigneeId: patch.assignee_id, actor: { id: null, name: "An automation" } }));
  const updated = (await mergeResponseMeta(row.id, { automationsRun: ran }, patch)) || { ...row, ...patch };
  await Promise.allSettled(tasks.map((t) => t()));
  await logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, action: "automation.ran", detail: { automations: ran } });
  return { row: updated, escalate };
}

// Full post-insert fan-out for a new response. `answers` are the plaintext answers (never stored).
export async function runSubmissionEffects({ form, row, answers, origin, editUrl, extras, files, recordToken = null }) {
  const { row: current, escalate } = await runAutomations({ form, row, answers, origin }).catch((e) => {
    console.error("[effects.automations]", e);
    return { row, escalate: false };
  });
  const s = form.settings;
  const rowsForFlow = labelledAnswers(form, answers);
  const results = await Promise.allSettled([
    sendConfirmation({ form, row: current, answers, extras, editUrl }),
    sendAdminNotification({ form, row: current, answers, origin }),
    sendSlack({ form, row: current, answers, origin }),
    dispatchEvent(form, "response.created", responsePayload(form, current, safeAnswers(current, form, "[protected]")), current.id),
    escalate || shouldEscalate(form, current)
      ? createFlowIssue({ form, row: current, rows: rowsForFlow, link: workspaceUrl(origin, form, current.id) })
      : null,
    s.notifyFlow ? notifyFlowUsers({ form, row: current }) : null,
    current.status === "Pending" ? sendApprovalRequest({ form, row: { ...current, answers }, origin }) : null,
    syncAssets({ form, row: current, files }),
    s.contactSync?.enabled ? syncContact({ form, row: current, answers, recordToken }) : null,
  ]);
  for (const r of results) if (r.status === "rejected") console.error("[effects]", r.reason);
  return current;
}

// Fan-out for an edited response.
export async function runEditEffects({ form, row }) {
  const results = await Promise.allSettled([
    dispatchEvent(form, "response.updated", responsePayload(form, row, safeAnswers(row, form, "[protected]")), row.id),
    logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: { name: "Respondent" }, action: "response.edited", detail: { title: form.title } }),
  ]);
  for (const r of results) if (r.status === "rejected") console.error("[effects.edit]", r.reason);
}
