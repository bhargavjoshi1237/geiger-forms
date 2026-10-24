import "server-only";
import { adminClient, formsAdmin } from "@/lib/server/supabase-admin";
import { answersText, mergeResponseMeta } from "@/lib/server/forms";

// Geiger Flow integration: escalate a response into a flow.issues row and push suite notifications.

const PRIORITY_MAP = { High: "high", Medium: "medium", Low: "low" };

async function flowProjectId(projectId) {
  if (!projectId) return null;
  const { data, error } = await adminClient().from("projects").select("flow_project_id").eq("id", projectId).maybeSingle();
  if (error) {
    console.error("[flow.project]", error.message);
    return null;
  }
  return data?.flow_project_id ?? null;
}

// Creates the issue and stores metadata.flowIssue on the response. Returns { id, number, projectId } or null.
export async function createFlowIssue({ form, row, rows, link }) {
  const admin = adminClient();
  if (!admin) return null;
  try {
    const projectId = await flowProjectId(form.projectId);
    if (!projectId) {
      console.info("[flow.issue] form has no linked Flow project; skipped");
      return null;
    }
    const flow = admin.schema("flow");
    const { data: number, error: numberError } = await flow.rpc("next_issue_number", { p_project_id: projectId });
    if (numberError) console.error("[flow.issue.number]", numberError.message);
    const respondent = row.respondent_name || row.respondent_email || "Anonymous";
    const description = [
      `Submitted ${new Date(row.submitted_at || Date.now()).toUTCString()} via Geiger Forms.`,
      row.score != null ? `Score: ${row.score} · Priority: ${row.priority}` : `Priority: ${row.priority}`,
      row.outcome ? `Outcome: ${row.outcome}` : null,
      "",
      answersText(rows),
      "",
      link ? `Open response: ${link}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");
    const labels = Array.isArray(form.settings?.flow?.labels) && form.settings.flow.labels.length ? form.settings.flow.labels : ["form"];
    const { data, error } = await flow
      .from("issues")
      .insert({
        project_id: projectId,
        number: Number.isFinite(Number(number)) ? Number(number) : null,
        title: `Form: ${form.title} — ${respondent}`.slice(0, 250),
        description,
        labels,
        priority: PRIORITY_MAP[row.priority] || "medium",
        metadata: { source: "geiger-forms", formId: form.id, responseId: row.id },
      })
      .select("id, number, project_id")
      .single();
    if (error) {
      console.error("[flow.issue]", error.message);
      return null;
    }
    const issue = { id: data.id, number: data.number, projectId: data.project_id };
    await mergeResponseMeta(row.id, { flowIssue: issue });
    return issue;
  } catch (e) {
    console.error("[flow.issue]", e?.message);
    return null;
  }
}

// Whether the form's escalation rule fires for this response.
export function shouldEscalate(form, row) {
  const rule = form.settings?.flow || {};
  if (!rule.escalate) return false;
  if (rule.when === "always") return true;
  if (rule.when === "outcome") return Boolean(row.outcome) && (!rule.outcome || rule.outcome === row.outcome);
  return row.priority === "High";
}

// Suite bell notifications for the form owner and active project members.
export async function notifyFlowUsers({ form, row }) {
  const admin = adminClient();
  if (!admin) return;
  const users = new Set(form.createdBy ? [form.createdBy] : []);
  if (form.projectId) {
    const { data, error } = await formsAdmin()
      .from("role_grants")
      .select("user_id")
      .eq("project_id", form.projectId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(200);
    if (error) console.error("[flow.notify.grants]", error.message);
    for (const g of data || []) users.add(g.user_id);
  }
  if (!users.size) return;
  const respondent = row.respondent_name || row.respondent_email || "Someone";
  const rows = [...users].map((userId) => ({
    user_id: userId,
    type: "form_response",
    title: `New response: ${form.title}`.slice(0, 200),
    description: `${respondent} submitted ${form.title}${row.priority === "High" ? " (high priority)" : ""}.`,
    icon: "FileText",
    icon_color: row.priority === "High" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400",
    bg_color: row.priority === "High" ? "bg-red-500/10" : "bg-blue-500/10",
    extra: { formId: form.id, responseId: row.id, projectId: form.projectId ?? null },
  }));
  const { error } = await admin.from("flow_notifications").insert(rows);
  if (error) console.error("[flow.notify]", error.message);
}

// Suite bell alert for the form owner alone (system problems such as a failing webhook).
export async function notifyFormOwner({ form, type, title, description, icon, extra = {} }) {
  const admin = adminClient();
  if (!admin || !form.createdBy) return;
  const { error } = await admin.from("flow_notifications").insert({
    user_id: form.createdBy,
    type,
    title: String(title).slice(0, 200),
    description,
    icon,
    icon_color: "text-red-600 dark:text-red-400",
    bg_color: "bg-red-500/10",
    extra: { formId: form.id, projectId: form.projectId ?? null, ...extra },
  });
  if (error) console.error("[flow.notifyOwner]", error.message);
}

// Suite bell alert for a member who was just assigned responses on one form (never for self-assignment).
export async function notifyAssignment({ form, rows, assigneeId, actor }) {
  const admin = adminClient();
  if (!admin || !assigneeId || assigneeId === actor.id || !rows.length) return;
  const single = rows.length === 1 ? rows[0] : null;
  const respondent = single ? single.respondent_name || single.respondent_email || "a respondent" : null;
  const { error } = await admin.from("flow_notifications").insert({
    user_id: assigneeId,
    type: "form_assigned",
    title: (single ? `Assigned to you: ${form.title}` : `${rows.length} responses assigned to you`).slice(0, 200),
    description: single ? `${actor.name} assigned you ${respondent}'s response to ${form.title}.` : `${actor.name} assigned you ${rows.length} responses to ${form.title}.`,
    icon: "UserPlus",
    icon_color: "text-violet-600 dark:text-violet-400",
    bg_color: "bg-violet-500/10",
    extra: { formId: form.id, responseId: single?.id ?? null, projectId: form.projectId ?? null },
  });
  if (error) console.error("[flow.notifyAssignment]", error.message);
}

// Suite bell "mention" alerts for the members @mentioned in a response comment (the author is skipped).
export async function notifyMentions({ form, row, comment, actor }) {
  const admin = adminClient();
  const userIds = (comment.mentions || []).filter((id) => id !== actor.id);
  if (!admin || !userIds.length) return;
  const respondent = row.respondent_name || row.respondent_email || "a respondent";
  const { error } = await admin.from("flow_notifications").insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: "mention",
      title: `${actor.name} mentioned you`.slice(0, 200),
      description: `On ${respondent}'s response to ${form.title}.`,
      icon: "AtSign",
      icon_color: "text-sky-600 dark:text-sky-400",
      bg_color: "bg-sky-500/10",
      extra: { type: "comment", text: String(comment.body).slice(0, 280), formId: form.id, responseId: row.id, projectId: form.projectId ?? null },
    })),
  );
  if (error) console.error("[flow.notifyMentions]", error.message);
}
