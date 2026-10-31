// Approval engine shared by submit, the Stripe webhook, the decision route, reminders and the panel: steps, skip conditions, vote rules and overrides.

import { isInputField } from "./field-types";
import { includedFields, matchesConditions } from "./logic";

export const APPROVAL_RULES = [
  { value: "any", label: "Any one approver decides" },
  { value: "all", label: "Everyone must approve" },
  { value: "majority", label: "A majority must approve" },
];

const NOT_EDITABLE = new Set(["file", "signature", "booking", "product", "calculated", "hidden", "total"]);
const DAY = 86_400_000;

const emailOf = (value) => String(value || "").trim().toLowerCase();
export const stepApprovers = (step) => (step?.approvers || []).map(emailOf).filter(Boolean);

// A step with conditions runs only when they match; encrypted answers can't match, so the editor doesn't offer sensitive fields.
export function stepApplies(step, answers) {
  return matchesConditions(step?.conditions, step?.conditionLogic, answers || {});
}

// The first step at or after `from` that applies, or -1.
export function nextStepIndex(steps, from, answers) {
  for (let i = Math.max(0, from); i < (steps || []).length; i += 1) if (stepApplies(steps[i], answers)) return i;
  return -1;
}

// A new response's approval state, or null when approvals are off or no step applies to it.
export function startApproval(settings, answers) {
  const config = settings?.approval;
  if (!config?.enabled) return null;
  const stepIndex = nextStepIndex(config.steps, 0, answers);
  return stepIndex < 0 ? null : { stepIndex, state: "pending", history: [] };
}

// "approved" | "rejected" | "pending" for a step's votes under its rule; without named approvers the first vote decides.
export function tallyVotes(step, votes) {
  const total = stepApprovers(step).length;
  const yes = votes.filter((v) => v.decision === "approve").length;
  const no = votes.length - yes;
  const rule = total ? step?.rule : "any";
  if (rule === "all") return no > 0 ? "rejected" : yes >= total ? "approved" : "pending";
  if (rule === "majority") return yes > total / 2 ? "approved" : no >= total / 2 ? "rejected" : "pending";
  return no > 0 ? "rejected" : yes > 0 ? "approved" : "pending";
}

// Named approvers who haven't voted on the current step.
export function pendingApprovers(step, approval) {
  const voted = new Set((approval?.votes || []).map((v) => emailOf(v.email)));
  return stepApprovers(step).filter((email) => !voted.has(email));
}

// Applies one decision: { error, code } on refusal, else { approval, status, advanced, final }. `override` resolves the step whatever its rule.
export function recordDecision({ steps, approval, answers, decision, actor, note = "", override = false, edits = [], at = new Date().toISOString() }) {
  const stepIndex = Math.max(0, Number(approval?.stepIndex) || 0);
  const step = steps?.[stepIndex];
  const votes = Array.isArray(approval?.votes) ? approval.votes : [];
  const email = emailOf(actor?.email);
  if (!override && votes.some((v) => emailOf(v.email) === email)) return { error: "You've already voted on this step.", code: "conflict" };

  const vote = { email, name: actor?.name || "", decision };
  const entry = { stepIndex, stepName: step?.name || "Approval", decision, by: actor?.name, byEmail: actor?.email, note, at };
  if (override) entry.override = true;
  if (edits.length) entry.edits = edits;
  const history = [...(Array.isArray(approval?.history) ? approval.history : []), entry];
  const outcome = override ? (decision === "approve" ? "approved" : "rejected") : tallyVotes(step, [...votes, vote]);

  if (outcome === "pending") return { approval: { ...approval, stepIndex, state: "pending", history, votes: [...votes, vote] }, status: "Pending", advanced: false, final: false };
  if (outcome === "rejected") return { approval: { stepIndex, state: "rejected", history, votes: [] }, status: "Rejected", advanced: false, final: true };
  const next = nextStepIndex(steps, stepIndex + 1, answers);
  if (next < 0) return { approval: { stepIndex, state: "approved", history, votes: [] }, status: "Approved", advanced: false, final: true };
  return { approval: { stepIndex: next, state: "pending", history, votes: [] }, status: "Pending", advanced: true, final: false };
}

// Fields an approver may correct on a step: listed, still in the form, unencrypted, and storable without the respondent's upload or payment flow.
export function editableFields(step, fields) {
  const allowed = new Set(step?.editableFields || []);
  return includedFields(fields).filter((f) => allowed.has(f.id) && isInputField(f.type) && !f.sensitive && !NOT_EDITABLE.has(f.type));
}

// True when a pending response has sat for the form's reminder interval since its last decision or reminder.
export function reminderDue(config, approval, submittedAt, now = Date.now()) {
  const days = Number(config?.remindAfterDays) || 0;
  if (days <= 0 || approval?.state !== "pending") return false;
  const history = Array.isArray(approval.history) ? approval.history : [];
  const last = Math.max(Date.parse(submittedAt) || 0, Date.parse(history[history.length - 1]?.at) || 0, Date.parse(approval.remindedAt) || 0);
  return now - last >= days * DAY;
}
