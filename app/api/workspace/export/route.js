import { fail, isEmail, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { decryptAnswers, isEncrypted, sha256Hex } from "@/lib/server/crypto";
import { logAccess, logActivity, toServerForm } from "@/lib/server/forms";
import { findRespondentRows, likeExact } from "@/lib/server/respondent";
import { isFormPath, signedDownloadUrls } from "@/lib/server/storage";
import { requireUser } from "@/lib/server/workspace";
import { labelAnswers } from "@/lib/forms/logic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LINK_SECONDS = 3600;

// Uploaded files, signatures and countersignatures a row references inside its own form's folder, deduped by storage path.
function referencedFiles(formId, answers, metadata) {
  const byPath = new Map();
  const add = (file, fieldId = null) => {
    const path = file?.path;
    if (!isFormPath(formId, path) || byPath.has(path)) return;
    byPath.set(path, { path, fieldId: file.fieldId ?? fieldId, name: file.name || path.split("/").pop(), size: Number(file.size) || null, type: file.type || null });
  };
  for (const [fieldId, value] of Object.entries(answers)) {
    for (const item of Array.isArray(value) ? value : [value]) if (item && typeof item === "object") add(item, fieldId);
  }
  for (const file of metadata?.files || []) add(file);
  if (metadata?.countersign?.signature) add({ path: metadata.countersign.signature, name: "countersignature.png", type: "image/png" });
  return [...byPath.values()];
}

// Decrypts a row's answers (as a reveal would) and notes which fields were encrypted and which files it references.
function openRow(row) {
  const raw = row.answers || {};
  const answers = decryptAnswers(raw);
  return { row, answers, encrypted: Object.keys(raw).filter((k) => isEncrypted(raw[k])), files: referencedFiles(row.form_id, answers, row.metadata) };
}

// GDPR subject access: a JSON bundle of everything held about a respondent across forms the caller may export from.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 2 * 1024);
  if (bodyError) return bodyError;
  if (!isEmail(body.email)) return fail("Enter a valid email address.", 400, { code: "validation" });
  const email = body.email.trim().toLowerCase();
  const db = formsAdmin();

  const found = await findRespondentRows(user, email, "forms.response.export", { formColumns: "title, schema" });
  if (!found) return fail("Couldn't look up that respondent.", 500);
  const { forms } = found;
  if (!found.responses.length && !found.partials.length) return ok({ counts: { responses: 0, partials: 0, bookings: 0, files: 0 } });

  const ids = found.responses.map((r) => r.id);
  const [byEmail, byResponse, comments] = await Promise.all([
    db.from("bookings").select("*").in("form_id", [...forms.keys()]).ilike("email", likeExact(email)),
    ids.length ? db.from("bookings").select("*").in("response_id", ids) : { data: [] },
    ids.length ? db.from("comments").select("response_id, author, body, created_at").in("response_id", ids).order("created_at") : { data: [] },
  ]);
  const failed = [byEmail, byResponse, comments].find((r) => r.error);
  if (failed) {
    console.error("[api.export]", failed.error.message);
    return fail("Couldn't gather that respondent's data.", 500);
  }

  const responses = found.responses.map(openRow);
  const partials = found.partials.map(openRow);
  const paths = [...new Set([...responses, ...partials].flatMap((o) => o.files.map((f) => f.path)))];
  const urls = await signedDownloadUrls(paths, LINK_SECONDS);
  const fieldDefs = new Map([...forms.values()].map((f) => [f.id, toServerForm(f).fieldDefs]));
  const formRef = (formId) => ({ id: formId, title: forms.get(formId)?.title || "" });
  const content = ({ row, answers, files }) => ({
    answers,
    labelled: labelAnswers(answers, fieldDefs.get(row.form_id)),
    files: files.map(({ path, ...file }) => ({ ...file, url: urls.get(path) || null })),
  });
  const notes = new Map();
  for (const c of comments.data) notes.set(c.response_id, [...(notes.get(c.response_id) || []), { author: c.author, body: c.body, createdAt: c.created_at }]);
  const bookings = [...new Map([...byEmail.data, ...byResponse.data].map((b) => [b.id, b])).values()];

  const bundle = {
    subject: email,
    generatedAt: new Date().toISOString(),
    fileLinksExpireAt: new Date(Date.now() + LINK_SECONDS * 1000).toISOString(),
    responses: responses.map((open) => {
      const r = open.row;
      return {
        id: r.id,
        form: formRef(r.form_id),
        respondent: { name: r.respondent_name, email: r.respondent_email, userId: r.respondent_user_id },
        submittedAt: r.submitted_at,
        editedAt: r.edited_at,
        deletedAt: r.deleted_at,
        status: r.status,
        priority: r.priority,
        score: r.score,
        outcome: r.outcome,
        tags: r.tags,
        assignee: r.assignee,
        approval: r.approval,
        payment: r.payment_status ? { status: r.payment_status, amount: r.payment_amount, currency: r.payment_currency, reference: r.payment_ref } : null,
        ...content(open),
        comments: notes.get(r.id) || [],
        userAgent: r.user_agent,
        completionMs: r.completion_ms,
        metadata: r.metadata,
      };
    }),
    partials: partials.map((open) => {
      const p = open.row;
      return {
        id: p.id,
        form: formRef(p.form_id),
        email: p.respondent_email,
        ...content(open),
        progress: p.progress,
        pageIndex: p.page_index,
        lastFieldId: p.last_field_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        completedAt: p.completed_at,
        deletedAt: p.deleted_at,
        metadata: p.metadata,
      };
    }),
    bookings: bookings.map((b) => ({
      id: b.id,
      form: formRef(b.form_id),
      responseId: b.response_id,
      fieldId: b.field_id,
      start: b.slot_start,
      end: b.slot_end,
      email: b.email,
      createdAt: b.created_at,
      deletedAt: b.deleted_at,
      metadata: b.metadata,
    })),
  };

  // Same per-form audit line as erase, plus an access-log export entry naming the decrypted fields.
  const emailHash = sha256Hex(email).slice(0, 16);
  const perForm = new Map();
  const entry = (formId) => {
    if (!perForm.has(formId)) perForm.set(formId, { responseIds: [], partials: 0, fields: new Set() });
    return perForm.get(formId);
  };
  for (const { row, encrypted } of responses) {
    const e = entry(row.form_id);
    e.responseIds.push(row.id);
    encrypted.forEach((f) => e.fields.add(f));
  }
  for (const { row, encrypted } of partials) {
    const e = entry(row.form_id);
    e.partials += 1;
    encrypted.forEach((f) => e.fields.add(f));
  }
  await Promise.allSettled(
    [...perForm].flatMap(([formId, e]) => [
      logActivity({ projectId: forms.get(formId)?.project_id ?? null, formId, actor: user, action: "respondent.exported", detail: { emailHash, count: e.responseIds.length, partials: e.partials } }),
      logAccess({
        formId,
        responseId: e.responseIds.length === 1 ? e.responseIds[0] : null,
        user,
        action: "export",
        metadata: { request: "subject_access", emailHash, responseIds: e.responseIds.slice(0, 500), fields: [...e.fields] },
      }),
    ]),
  );

  return ok({ counts: { responses: responses.length, partials: partials.length, bookings: bookings.length, files: paths.length }, bundle });
}
