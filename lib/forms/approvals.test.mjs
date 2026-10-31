import test from "node:test";
import assert from "node:assert/strict";

import { editableFields, nextStepIndex, pendingApprovers, recordDecision, reminderDue, startApproval, tallyVotes } from "./approvals.js";

const step = (rule, approvers = ["a@x.co", "b@x.co", "c@x.co"], extra = {}) => ({ id: rule, name: rule, rule, approvers, ...extra });
const votes = (...list) => list.map((decision, i) => ({ email: `${i}@x.co`, decision }));
const actor = (email) => ({ email, name: email });
const decide = (steps, approval, decision, email, extra = {}) => recordDecision({ steps, approval, answers: {}, decision, actor: actor(email), ...extra });

test("any: the first vote decides", () => {
  assert.equal(tallyVotes(step("any"), votes("approve")), "approved");
  assert.equal(tallyVotes(step("any"), votes("reject")), "rejected");
  assert.equal(tallyVotes(step("any"), []), "pending");
});

test("all: one rejection ends it and every approver must agree", () => {
  assert.equal(tallyVotes(step("all"), votes("approve", "approve")), "pending");
  assert.equal(tallyVotes(step("all"), votes("approve", "approve", "approve")), "approved");
  assert.equal(tallyVotes(step("all"), votes("approve", "reject")), "rejected");
});

test("majority: decided as soon as the result can't change", () => {
  assert.equal(tallyVotes(step("majority"), votes("approve")), "pending");
  assert.equal(tallyVotes(step("majority"), votes("approve", "approve")), "approved");
  assert.equal(tallyVotes(step("majority"), votes("reject", "reject")), "rejected");
  const even = step("majority", ["a@x.co", "b@x.co", "c@x.co", "d@x.co"]);
  assert.equal(tallyVotes(even, votes("approve", "approve")), "pending");
  assert.equal(tallyVotes(even, votes("reject", "reject")), "rejected", "a tie can't reach a majority");
});

test("a rule with no named approvers falls back to the first vote", () => {
  assert.equal(tallyVotes(step("all", []), votes("approve")), "approved");
});

test("steps whose conditions don't match are skipped", () => {
  const cond = { fieldId: "amount", operator: "gt", value: "100" };
  const steps = [step("any", ["a@x.co"], { conditions: [cond], conditionLogic: "all" }), step("any", ["b@x.co"])];
  assert.equal(nextStepIndex(steps, 0, { amount: "5" }), 1);
  assert.equal(nextStepIndex(steps, 0, { amount: "500" }), 0);
  assert.equal(startApproval({ approval: { enabled: true, steps } }, { amount: "5" }).stepIndex, 1);
});

test("no approval starts when it's off or no step applies", () => {
  assert.equal(startApproval({ approval: { enabled: false, steps: [step("any")] } }, {}), null);
  const only = step("any", ["a@x.co"], { conditions: [{ fieldId: "x", operator: "equals", value: "y" }] });
  assert.equal(startApproval({ approval: { enabled: true, steps: [only] } }, {}), null);
  assert.equal(startApproval({ approval: { enabled: true, steps: [] } }, {}), null);
});

test("a parallel step waits for its votes, then advances", () => {
  const steps = [step("all", ["a@x.co", "b@x.co"]), step("any", ["c@x.co"])];
  const first = decide(steps, { stepIndex: 0, state: "pending", history: [] }, "approve", "A@x.co");
  assert.deepEqual([first.status, first.advanced, first.final], ["Pending", false, false]);
  assert.deepEqual(pendingApprovers(steps[0], first.approval), ["b@x.co"]);
  const second = decide(steps, first.approval, "approve", "b@x.co");
  assert.deepEqual([second.status, second.advanced, second.approval.stepIndex, second.approval.votes.length], ["Pending", true, 1, 0]);
  assert.equal(second.approval.history.length, 2);
  const last = decide(steps, second.approval, "approve", "c@x.co");
  assert.deepEqual([last.status, last.final, last.approval.state], ["Approved", true, "approved"]);
});

test("voting twice is refused", () => {
  const steps = [step("all")];
  const first = decide(steps, { stepIndex: 0, state: "pending", history: [] }, "approve", "a@x.co");
  assert.equal(decide(steps, first.approval, "approve", "A@X.CO ").code, "conflict");
});

test("any rejection closes the request", () => {
  const steps = [step("majority"), step("any")];
  const result = decide(steps, { stepIndex: 0, state: "pending", history: [], votes: [{ email: "a@x.co", decision: "reject" }] }, "reject", "b@x.co");
  assert.deepEqual([result.status, result.final, result.approval.state], ["Rejected", true, "rejected"]);
});

test("an override resolves the step and is marked in the history", () => {
  const steps = [step("all")];
  const result = decide(steps, { stepIndex: 0, state: "pending", history: [] }, "approve", "admin@x.co", { override: true, note: "Urgent" });
  assert.equal(result.status, "Approved");
  assert.equal(result.approval.history[0].override, true);
  assert.equal(result.approval.history[0].note, "Urgent");
});

test("only safe, listed fields can be edited", () => {
  const fields = [
    { id: "a", type: "text", included: true },
    { id: "b", type: "text", included: true, sensitive: true },
    { id: "c", type: "file", included: true },
    { id: "d", type: "text", included: true },
    { id: "e", type: "heading", included: true },
  ];
  assert.deepEqual(editableFields({ editableFields: ["a", "b", "c", "e", "gone"] }, fields).map((f) => f.id), ["a"]);
});

test("reminders count from the latest of submit, decision and last reminder", () => {
  const day = 86_400_000;
  const now = Date.parse("2026-11-10T00:00:00Z");
  const iso = (daysAgo) => new Date(now - daysAgo * day).toISOString();
  const config = { remindAfterDays: 3 };
  assert.equal(reminderDue(config, { state: "pending" }, iso(4), now), true);
  assert.equal(reminderDue(config, { state: "pending" }, iso(2), now), false);
  assert.equal(reminderDue(config, { state: "pending", history: [{ at: iso(1) }] }, iso(9), now), false);
  assert.equal(reminderDue(config, { state: "pending", remindedAt: iso(1) }, iso(9), now), false);
  assert.equal(reminderDue(config, { state: "approved" }, iso(9), now), false);
  assert.equal(reminderDue({}, { state: "pending" }, iso(9), now), false);
});
