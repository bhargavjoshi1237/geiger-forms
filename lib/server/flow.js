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
    icon_color: row.priority === "High" ? "text-red-400" : "text-blue-400",
    bg_color: row.priority === "High" ? "bg-red-500/10" : "bg-blue-500/10",
    extra: { formId: form.id, responseId: row.id, projectId: form.projectId ?? null },
  }));
  const { error } = await admin.from("flow_notifications").insert(rows);
  if (error) console.error("[flow.notify]", error.message);
}
