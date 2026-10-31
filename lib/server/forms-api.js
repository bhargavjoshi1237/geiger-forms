import "server-only";
import { collectWarnings } from "@/components/forms/builder/doc-checks";
import { FIELD_TYPES } from "@/lib/forms/field-types";
import {
  FORM_STATUSES,
  RESPONSE_PRIORITIES,
  RESPONSE_STATUSES,
  defaultSettings,
  makeFieldId,
  normalizeSettings,
  publicSettings,
  slugify,
  toCanonicalField,
} from "@/lib/forms/schema";
import { findProjectMember, projectMembers } from "@/lib/server/auth";
import { FORM_COLUMNS, logActivity, safeAnswers, safeRespondent, toServerForm } from "@/lib/server/forms";
import { appOrigin, fail, jsonSize } from "@/lib/server/http";
import { notifyAssignment, notifyMentions } from "@/lib/server/flow";
import { publicFieldDefs } from "@/lib/server/public-form";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { dispatchEvent, responsePayload } from "@/lib/server/webhooks";

// Service layer behind REST v1 and the MCP server: safe views plus validated reads and writes. Callers pass the
// client (service role for API keys, the user's token for MCP) after checking access; every row's project is re-checked here.

export const MAX_FIELDS = 500;
export const MAX_TITLE = 200;
export const MAX_DESCRIPTION = 5000;
export const MAX_CATEGORY = 120;
export const MAX_TAGS = 30;
export const MAX_TAG = 60;
export const MAX_COMMENT = 5000;
export const MAX_MENTIONS = 20;
const MAX_FIELDS_BYTES = 200 * 1024;
const MAX_SETTINGS_BYTES = 64 * 1024;
const ANALYTICS_SAMPLE = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIELD_ID_RE = /^(?!__)[A-Za-z0-9_-]{1,100}$/;
const SECRET_KEY = /secret|password|salt|token|api[-_]?key|signing|credential|private[-_]?key|hash$/i;
const UNSAFE_URL = /^\s*(javascript:|vbscript:|data:(?!image\/))/i;
const FIELD_TEXT_KEYS = ["title", "label", "placeholder", "hint", "formula"];
// Stored as text or a number, so their type can't be checked against the default.
const LOOSE_SETTINGS = new Set(["responseLimit", "highThreshold", "mediumThreshold"]);

// Who a REST write is attributed to: keys have no user behind them.
export const API_KEY_ACTOR = { id: null, name: "API key" };

// Settings an API caller may change. Anything that moves data out or opens a form up (webhooks, Slack, notification
// recipients, automations, access, password, payments, retention, sharing) stays workspace-only.
const WRITABLE_SETTINGS = new Set([
  "coverStyle", "coverUrl", "showIcon", "logoUrl", "logoAlt", "branding", "theme", "layout", "progressBar", "locale", "welcome", "translations",
  "pageLayout", "sidePosition", "sideImageUrl", "sideImageAlt", "sideEyebrow", "sideHeadline", "sideTags", "sideCredit", "customCss",
  "submitAnother", "steps", "openDate", "closeDate", "closedMessage", "responseLimit", "showResponseLimit",
  "thankYouType", "thankYouTitle", "thankYouText", "thankYouUrl", "showScore", "saveResume", "offline",
  "scoringEnabled", "highThreshold", "mediumThreshold", "branchingEnabled", "branches", "quiz", "abTest",
]);
const NESTED_WRITABLE = new Set(["theme", "welcome", "quiz", "abTest"]);

// An error whose message is safe to show the caller. A null code keeps older REST error bodies unchanged.
export class ApiError extends Error {
  constructor(code, status, message, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
    this.expose = true;
  }
}

const invalid = (message, extra) => new ApiError("validation", 422, message, extra);
const notFoundError = (what) => new ApiError("not_found", 404, `${what} not found.`);

// Turns a service error into the REST reply; anything unexpected is logged and stays generic.
export function apiFailure(error, label) {
  if (error instanceof ApiError) return fail(error.message, error.status, { ...(error.code ? { code: error.code } : {}), ...error.extra });
  console.error(`[${label}]`, error);
  return fail("Something went wrong. Please try again.", 500);
}

function check({ data, error }, code, message) {
  if (error) {
    console.error(`[forms-api.${code}]`, error.message);
    throw new ApiError(null, 500, message);
  }
  return data;
}

// --- Safe views ----------------------------------------------------------------

// Drops any secret-looking key at any depth, including legacy keys normalizeSettings passes through untouched.
function scrubSecrets(value) {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !SECRET_KEY.test(key)).map(([key, inner]) => [key, scrubSecrets(inner)]));
}

export function apiForm(form, { detail = false } = {}) {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    status: form.status,
    category: form.category,
    tags: form.tags,
    responses: form.responses,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    publishedAt: form.publishedAt,
    ...(detail ? { fields: publicFieldDefs(form.fieldDefs), settings: scrubSecrets(publicSettings(form.settings)) } : {}),
  };
}

// Response view for API consumers; sensitive answers are masked and never decrypted.
export function apiResponse(row, form) {
  return {
    id: row.id,
    formId: row.form_id,
    status: row.status,
    priority: row.priority,
    score: row.score,
    outcome: row.outcome,
    tags: row.tags || [],
    assignee: row.assignee || null,
    respondent: safeRespondent(row, form),
    answers: safeAnswers(row, form),
    encryptedFields: row.metadata?.encryptedFields || [],
    approval: row.approval || {},
    payment: row.payment_status ? { status: row.payment_status, amount: Number(row.payment_amount ?? 0), currency: row.payment_currency } : null,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
  };
}

// The PDF link carries no credential: fetching it takes the same API key.
export function withPdfUrl(request, row, form) {
  return { ...apiResponse(row, form), pdfUrl: `${appOrigin(request)}/api/v1/forms/${row.form_id}/responses/${row.id}/pdf` };
}

// A form that shows respondents their answers also returns the key from submit; API callers never get it.
export function withoutAnswerKey(result) {
  if (!result.quiz?.correct) return result;
  const quiz = { ...result.quiz };
  delete quiz.correct;
  return { ...result, quiz };
}

function apiComment(row) {
  return { id: row.id, responseId: row.response_id, body: row.body, author: row.author, mentions: row.mentions || [], createdAt: row.created_at };
}

// --- Reads ---------------------------------------------------------------------

export async function listForms(db, projectId, { limit = 500, offset = 0, status } = {}) {
  let query = db.from("forms").select("*").is("deleted_at", null).eq("is_template", false).eq("project_id", projectId);
  if (status) query = query.eq("status", status);
  query = query.order("updated_at", { ascending: false });
  query = offset ? query.range(offset, offset + limit - 1) : query.limit(limit);
  return (check(await query, "listForms", "Couldn't load forms.") || []).map(toServerForm);
}

// The live, non-template form in this project, else not found: a forged id from another project reads the same as a missing one.
export async function getForm(db, projectId, id) {
  if (!projectId || !UUID_RE.test(String(id || ""))) throw notFoundError("Form");
  const data = check(await db.from("forms").select(FORM_COLUMNS).eq("id", id).eq("project_id", projectId).is("deleted_at", null).maybeSingle(), "getForm", "Couldn't load the form.");
  if (!data || data.project_id !== projectId || data.is_template) throw notFoundError("Form");
  return toServerForm(data);
}

// A live response plus its form, re-checking that the form belongs to this project.
export async function getResponse(db, projectId, id) {
  if (!UUID_RE.test(String(id || ""))) throw notFoundError("Response");
  const row = check(await db.from("responses").select("*").eq("id", id).is("deleted_at", null).maybeSingle(), "getResponse", "Couldn't load the response.");
  if (!row) throw notFoundError("Response");
  try {
    return { row, form: await getForm(db, projectId, row.form_id) };
  } catch (error) {
    if (error.code === "not_found") throw notFoundError("Response");
    throw error;
  }
}

const CURSOR_TIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}(:\d{2})?)$/;

// Opaque cursor: base64url("<submitted_at>|<id>").
const encodeCursor = (row) => Buffer.from(`${row.submitted_at}|${row.id}`).toString("base64url");

// Strict: the decoded parts go into an or() filter, and Date.parse alone accepts free text.
function decodeCursor(value) {
  const parts = Buffer.from(String(value), "base64url").toString("utf8").split("|");
  if (parts.length !== 2) return null;
  const [at, id] = parts;
  return CURSOR_TIME_RE.test(at) && !Number.isNaN(Date.parse(at)) && UUID_RE.test(id) ? { at, id } : null;
}

// Live responses oldest-first, paged by (submitted_at, id); `since` is an ISO lower bound.
export async function listResponses(db, form, { limit, since, cursor: cursorParam, status, maxLimit = 200 } = {}) {
  const size = Math.min(maxLimit, Math.max(1, Math.floor(Number(limit)) || 50));
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;
  if (cursorParam && !cursor) throw new ApiError(null, 400, "Invalid cursor.");
  if (since && Number.isNaN(Date.parse(since))) throw new ApiError(null, 400, "`since` must be an ISO date.");

  let query = db
    .from("responses")
    .select("*")
    .eq("form_id", form.id)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(size + 1);
  if (status) query = query.eq("status", status);
  if (since) query = query.gte("submitted_at", new Date(since).toISOString());
  if (cursor) query = query.or(`submitted_at.gt."${cursor.at}",and(submitted_at.eq."${cursor.at}",id.gt.${cursor.id})`);
  const rows = check(await query, "listResponses", "Couldn't load responses.") || [];
  const page = rows.slice(0, size);
  return { rows: page, nextCursor: rows.length > size ? encodeCursor(page[page.length - 1]) : null };
}

async function countRows(db, table, apply) {
  const { count, error } = await apply(db.from(table).select("id", { count: "exact", head: true }));
  if (error) {
    console.error("[forms-api.analytics]", error.message);
    throw new ApiError(null, 500, "Couldn't load analytics.");
  }
  return count || 0;
}

const average = (values) => (values.length ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10 : null);

// Aggregates only: no answers or respondent details, so nothing sensitive can reach it.
export async function formAnalytics(db, form) {
  const live = (query) => query.eq("form_id", form.id).is("deleted_at", null);
  const tally = async (values, column) =>
    Object.fromEntries(await Promise.all(values.map(async (value) => [value, await countRows(db, "responses", (q) => live(q).eq(column, value))])));
  const eventCount = (type) => countRows(db, "form_events", (q) => q.eq("form_id", form.id).eq("type", type));

  const [byStatus, byPriority, views, starts, submits, abandoned, sample] = await Promise.all([
    tally(RESPONSE_STATUSES, "status"),
    tally(RESPONSE_PRIORITIES, "priority"),
    eventCount("view"),
    eventCount("start"),
    eventCount("submit"),
    countRows(db, "partials", (q) => live(q).is("completed_at", null)),
    db.from("responses").select("score, completion_ms, submitted_at").eq("form_id", form.id).is("deleted_at", null).neq("status", "Spam").order("submitted_at", { ascending: false }).limit(ANALYTICS_SAMPLE),
  ]);
  const rows = check(sample, "analytics", "Couldn't load analytics.") || [];
  const since = (days) => rows.filter((r) => Date.parse(r.submitted_at) >= Date.now() - days * 86_400_000).length;
  const total = Object.entries(byStatus).reduce((sum, [status, count]) => (status === "Spam" ? sum : sum + count), 0);
  const seconds = rows.filter((r) => r.completion_ms != null).map((r) => Number(r.completion_ms) / 1000);
  return {
    formId: form.id,
    title: form.title,
    status: form.status,
    responses: {
      total,
      byStatus,
      byPriority,
      last7Days: since(7),
      last30Days: since(30),
      averageScore: average(rows.filter((r) => r.score != null).map((r) => Number(r.score))),
      averageCompletionSeconds: average(seconds),
      sampled: rows.length,
    },
    funnel: { views, starts, submits, abandoned, completionRate: views ? Math.round((submits / views) * 1000) / 10 : null },
  };
}

// --- Form writes ---------------------------------------------------------------

function assertSafeContent(value) {
  if (typeof value === "string") {
    if (UNSAFE_URL.test(value)) throw invalid("Links must start with http:// or https://.");
  } else if (Array.isArray(value)) value.forEach(assertSafeContent);
  else if (value && typeof value === "object") Object.values(value).forEach(assertSafeContent);
}

function cleanTitle(value) {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw invalid("A form needs a title.");
  if (title.length > MAX_TITLE) throw invalid(`Keep the title under ${MAX_TITLE} characters.`);
  return title;
}

function cleanTags(value) {
  if (!Array.isArray(value) || value.length > MAX_TAGS) throw invalid(`Tags must be a list of at most ${MAX_TAGS}.`);
  const tags = value.map((tag) => (typeof tag === "string" ? tag.trim() : ""));
  if (tags.some((tag) => !tag || tag.length > MAX_TAG)) throw invalid(`Each tag must be text of 1 to ${MAX_TAG} characters.`);
  return [...new Set(tags)];
}

function cleanColumns(input) {
  const columns = {};
  if ("title" in input) columns.title = cleanTitle(input.title);
  if ("description" in input) {
    if (typeof input.description !== "string" || input.description.length > MAX_DESCRIPTION) throw invalid(`The description must be text under ${MAX_DESCRIPTION} characters.`);
    columns.description = input.description;
  }
  if ("category" in input) {
    if (input.category !== null && (typeof input.category !== "string" || input.category.length > MAX_CATEGORY)) throw invalid(`The category must be text under ${MAX_CATEGORY} characters.`);
    columns.category = input.category;
  }
  if ("tags" in input) columns.tags = cleanTags(input.tags);
  return columns;
}

// Canonical fields for a full replace. Reads never return answer keys, so an omitted key keeps its stored value, and a
// sensitive field can't be removed or downgraded here: either would expose answers that are masked today.
export function cleanFields(input, existing = []) {
  if (!Array.isArray(input) || input.length > MAX_FIELDS) throw invalid(`Fields must be a list of at most ${MAX_FIELDS}.`);
  if (jsonSize(input) > MAX_FIELDS_BYTES) throw invalid("These fields are too large to save.");
  assertSafeContent(input);
  const previous = new Map(existing.map((f) => [f.id, f]));
  const seen = new Set();
  const fields = input.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw invalid("Each field must be an object.");
    if (!FIELD_TYPES[raw.type]) throw invalid(`Unknown field type: ${String(raw.type).slice(0, 40)}.`);
    const id = raw.id == null ? makeFieldId() : raw.id;
    if (typeof id !== "string" || !FIELD_ID_RE.test(id)) throw invalid("Field ids may only use letters, numbers, - and _.");
    if (FIELD_TEXT_KEYS.some((key) => raw[key] != null && typeof raw[key] !== "string")) throw invalid(`Field ${id}: ${FIELD_TEXT_KEYS.join(", ")} must be text.`);
    if (seen.has(id)) throw invalid(`Duplicate field id: ${id}.`);
    seen.add(id);
    const before = previous.get(id);
    const field = toCanonicalField({ ...raw, id });
    if (before && !("correctAnswer" in raw)) field.correctAnswer = before.correctAnswer;
    if (before && !("optionPoints" in raw)) field.optionPoints = before.optionPoints;
    if (before?.sensitive) field.sensitive = true;
    return field;
  });
  const dropped = existing.filter((f) => f.sensitive && !seen.has(f.id));
  if (dropped.length) throw invalid("Sensitive fields can't be removed through the API. Remove them in the workspace.", { fieldIds: dropped.map((f) => f.id) });
  return fields;
}

// The stored shape of a settings patch: only writable keys, with nested groups merged over their current values.
export function cleanSettingsPatch(input, current) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid("Settings must be an object.");
  if (jsonSize(input) > MAX_SETTINGS_BYTES) throw invalid("These settings are too large to save.");
  const locked = Object.keys(input).filter((key) => !WRITABLE_SETTINGS.has(key));
  if (locked.length) throw invalid(`These settings can only be changed in the workspace: ${locked.join(", ")}.`, { lockedSettings: locked });
  if (input.quiz && typeof input.quiz === "object" && "showAnswers" in input.quiz) {
    throw invalid("These settings can only be changed in the workspace: quiz.showAnswers.", { lockedSettings: ["quiz.showAnswers"] });
  }
  assertSafeContent(input);
  const defaults = defaultSettings();
  const patch = {};
  for (const [key, value] of Object.entries(input)) {
    const sameType = typeof value === typeof defaults[key] && Array.isArray(value) === Array.isArray(defaults[key]) && value !== null;
    if (!LOOSE_SETTINGS.has(key) && !sameType) throw invalid(`The ${key} setting has the wrong type.`);
    if (!NESTED_WRITABLE.has(key)) patch[key] = value;
    else if (value && typeof value === "object" && !Array.isArray(value)) patch[key] = { ...current[key], ...value };
    else throw invalid(`The ${key} setting must be an object.`);
  }
  const normalized = normalizeSettings({ ...current, ...patch });
  return Object.fromEntries(Object.keys(patch).map((key) => [key, normalized[key]]));
}

async function freeSlug(base) {
  const admin = formsAdmin();
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    const { data } = await admin.from("forms").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// New forms always start as a Draft in the caller's project.
export async function createForm(db, { projectId, input, actor }) {
  if (!projectId) throw new ApiError(null, 400, "A project is required.");
  const columns = cleanColumns(input);
  if (!columns.title) throw invalid("A form needs a title.");
  const fields = "fields" in input ? cleanFields(input.fields) : [];
  const defaults = defaultSettings();
  const settings = "settings" in input ? { ...defaults, ...cleanSettingsPatch(input.settings, defaults) } : defaults;
  const row = {
    description: "",
    category: null,
    tags: [],
    ...columns,
    slug: await freeSlug(slugify(columns.title) || "untitled-form"),
    schema: { fields },
    settings,
    status: "Draft",
    project_id: projectId,
    is_template: false,
    created_by: actor.id,
  };
  let result = await db.from("forms").insert(row).select(FORM_COLUMNS).single();
  // Another insert took the slug between the check and now.
  if (result.error?.code === "23505") result = await db.from("forms").insert({ ...row, slug: `${row.slug}-${Math.random().toString(36).slice(2, 6)}` }).select(FORM_COLUMNS).single();
  const form = toServerForm(check(result, "createForm", "Couldn't create the form."));
  await logActivity({ projectId, formId: form.id, actor, action: "form.created", detail: { title: form.title, via: "api" } });
  return form;
}

// Partial update of a loaded form. Publishing runs the builder's pre-flight checks; the caller must acknowledge what they find.
export async function updateForm(db, { form, input, actor }) {
  const columns = cleanColumns(input);
  const fields = "fields" in input ? cleanFields(input.fields, form.fieldDefs) : null;
  const settingsPatch = "settings" in input ? cleanSettingsPatch(input.settings, form.settings) : null;
  const status = "status" in input ? input.status : form.status;
  if (!FORM_STATUSES.includes(status)) throw invalid(`Status must be one of: ${FORM_STATUSES.join(", ")}.`);
  const statusChanged = status !== form.status;
  if (!Object.keys(columns).length && !fields && !settingsPatch && !("status" in input)) throw invalid("Provide at least one field to change.");

  const warnings = status === "Published" ? collectWarnings({ fields: fields || form.fieldDefs, settings: settingsPatch ? { ...form.settings, ...settingsPatch } : form.settings }) : [];
  if (statusChanged && status === "Published" && warnings.length && input.acknowledgeWarnings !== true) {
    throw new ApiError("publish_warnings", 409, "This form has problems to check before publishing. Fix them, or publish again with acknowledgeWarnings set to true.", { warnings });
  }

  if (settingsPatch) {
    check(await db.rpc("merge_settings", { p_id: form.id, p_patch: settingsPatch }), "updateForm.settings", "Couldn't save the form.");
  }
  const update = { ...columns };
  if (fields) update.schema = { fields };
  if (statusChanged) update.status = status;
  if (statusChanged && status === "Published") update.published_at = new Date().toISOString();
  const scoped = (query) => query.eq("id", form.id).eq("project_id", form.projectId).is("deleted_at", null);
  const data = check(
    Object.keys(update).length
      ? await scoped(db.from("forms").update(update)).select(FORM_COLUMNS).maybeSingle()
      : await scoped(db.from("forms").select(FORM_COLUMNS)).maybeSingle(),
    "updateForm",
    "Couldn't save the form.",
  );
  if (!data) throw notFoundError("Form");
  const updated = toServerForm(data);
  if (Object.keys(columns).length || fields || settingsPatch) {
    await logActivity({ projectId: form.projectId, formId: form.id, actor, action: "form.updated", detail: { title: updated.title, via: "api" } });
  }
  if (statusChanged) {
    await logActivity({ projectId: form.projectId, formId: form.id, actor, action: `form.${status.toLowerCase()}`, detail: { title: updated.title, via: "api" } });
  }
  return { form: updated, warnings };
}

// --- Response writes -----------------------------------------------------------

function checkResponseStatus(row, status) {
  if (!RESPONSE_STATUSES.includes(status)) throw invalid(`Status must be one of: ${RESPONSE_STATUSES.join(", ")}.`);
  if (status === row.status) return;
  if (status === "Awaiting payment" || row.status === "Awaiting payment") {
    throw new ApiError("invalid_state", 409, "Payment status is set by the payment provider, so it can't be changed here.");
  }
  if (["Approved", "Rejected"].includes(status) && row.approval?.state === "pending") {
    throw new ApiError("invalid_state", 409, "This response is in an approval workflow. Decide it in the workspace.");
  }
}

// Status, priority, tags and assignee only; the assignee is any member of the form's project by id, email or name, null clears it.
export async function updateResponse(db, { form, row, patch, actor }) {
  const update = {};
  if ("status" in patch) {
    checkResponseStatus(row, patch.status);
    update.status = patch.status;
  }
  if ("priority" in patch) {
    if (!RESPONSE_PRIORITIES.includes(patch.priority)) throw invalid(`Priority must be one of: ${RESPONSE_PRIORITIES.join(", ")}.`);
    update.priority = patch.priority;
  }
  if ("tags" in patch) update.tags = cleanTags(patch.tags);
  let assignee = null;
  if ("assignee" in patch) {
    if (patch.assignee !== null) {
      if (typeof patch.assignee !== "string" || !patch.assignee.trim() || patch.assignee.length > 320) throw invalid("Name a teammate to assign, or null to clear.");
      assignee = await findProjectMember(form, patch.assignee);
      if (!assignee) throw new ApiError("not_member", 422, "That person isn't a member of this workspace.");
    }
    update.assignee_id = assignee?.id ?? null;
    update.assignee = assignee?.name ?? null;
  }
  if (!Object.keys(update).length) throw invalid("Provide status, priority, tags or assignee to change.");

  const data = check(await db.from("responses").update(update).eq("id", row.id).eq("form_id", form.id).is("deleted_at", null).select("*").maybeSingle(), "updateResponse", "Couldn't save the response.");
  if (!data) throw notFoundError("Response");

  const reassigned = "assignee" in patch && (row.assignee_id ?? null) !== (assignee?.id ?? null);
  const results = await Promise.allSettled([
    logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor, action: "response.updated", detail: { ...update, via: "api" } }),
    reassigned ? notifyAssignment({ form, rows: [data], assigneeId: assignee?.id ?? null, actor }) : null,
    dispatchEvent(form, "response.updated", responsePayload(form, data, safeAnswers(data, form, "[protected]")), data.id),
  ]);
  for (const r of results) if (r.status === "rejected") console.error("[forms-api.updateResponse.effects]", r.reason);
  return data;
}

// Internal comment, written with the service role as the comments route does: signed-in clients can only read this table.
export async function addComment({ form, row, body, mentions, actor }) {
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) throw invalid("Write a comment first.");
  if (text.length > MAX_COMMENT) throw invalid(`Keep comments under ${MAX_COMMENT} characters.`);
  const requested = new Set((Array.isArray(mentions) ? mentions : []).map(String).slice(0, MAX_MENTIONS));
  const members = requested.size ? await projectMembers(form) : [];
  const { data, error } = await formsAdmin()
    .from("comments")
    .insert({ response_id: row.id, body: text, author: actor.name, author_id: actor.id, mentions: members.filter((m) => requested.has(m.id)).map((m) => m.id) })
    .select("*")
    .single();
  check({ data, error }, "addComment", "Couldn't post the comment.");
  await notifyMentions({ form, row, comment: data, actor });
  return apiComment(data);
}
