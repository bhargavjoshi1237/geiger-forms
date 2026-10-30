import { fail, forbidden, json, rateLimit, rateLimited, readJson } from "@/lib/server/http";
import { userCan } from "@/lib/server/auth";
import { logActivity } from "@/lib/server/forms";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { TypeformError, fetchTypeformDefinition } from "@/lib/server/typeform";
import { requireUser } from "@/lib/server/workspace";
import { ImportError, IMPORT_LIMITS } from "@/lib/forms/import/core";
import { importCsv, importGeigerJson } from "@/lib/forms/import/generic";
import { isValidTypeformToken, mapTypeformForm, parseTypeformId } from "@/lib/forms/import/typeform";
import { slugify } from "@/lib/forms/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };
const IMPORTS_PER_HOUR = 60;

// Bytes a JSON-escaped 2 MB payload can grow to, with room for the envelope.
const BODY_LIMIT = IMPORT_LIMITS.maxInputBytes * 2;

async function uniqueSlug(db, title) {
  const base = slugify(title).slice(0, 80) || "imported-form";
  for (let i = 1; i < 50; i += 1) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const { data, error } = await db.from("forms").select("id").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!data) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

// Always a Draft in the caller's project; the status isn't an input.
async function createDraft(db, { form }, user, projectId) {
  const { data, error } = await db
    .from("forms")
    .insert({
      slug: await uniqueSlug(db, form.title),
      title: form.title,
      description: form.description,
      category: form.category,
      tags: form.tags,
      schema: form.schema,
      settings: form.settings,
      metadata: form.metadata,
      status: "Draft",
      is_template: false,
      project_id: projectId,
      created_by: user.id,
    })
    .select("id, slug, title")
    .single();
  if (error) throw error;
  return data;
}

// Runs the importer for this request's source; each path goes through finalizeImport.
async function runImport(body) {
  switch (body.source) {
    case "typeform": {
      const id = parseTypeformId(body.form);
      if (!id) throw new ImportError("Enter a typeform.com form link or form id.");
      if (!isValidTypeformToken(body.token)) throw new ImportError("Enter a valid Typeform personal access token.");
      return mapTypeformForm(await fetchTypeformDefinition(id, body.token));
    }
    case "json":
      return importGeigerJson(String(body.text ?? ""));
    case "csv":
      return importCsv(String(body.text ?? ""), { title: typeof body.title === "string" ? body.title : "" });
    case "draft":
      // A previewed draft comes back through the client, so it's sanitised again rather than trusted.
      return importGeigerJson(body.draft && typeof body.draft === "object" ? body.draft : "");
    default:
      throw new ImportError("Choose what to import from.");
  }
}

// Previews an import, or with `commit` creates the draft. The request body is never logged because it can hold a Typeform token.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, BODY_LIMIT);
  if (bodyError) return bodyError;

  const projectId = String(body.projectId ?? "");
  if (!UUID_RE.test(projectId)) return fail("Open a project to import a form.", 400, { code: "validation" });
  if (!(await userCan(user, { project_id: projectId }, "forms.form.edit"))) return forbidden();
  if (!(await rateLimit(`import:${user.id}`, IMPORTS_PER_HOUR))) return rateLimited();

  try {
    const result = await runImport(body);
    if (!body.commit) return json({ ok: true, form: result.form, warnings: result.warnings, stats: result.stats }, 200, NO_STORE);

    const created = await createDraft(formsAdmin(), result, user, projectId);
    await logActivity({ projectId, formId: created.id, actor: user, action: "form.imported", detail: { title: created.title, source: result.form.metadata.import.source } });
    return json({ ok: true, form: created, warnings: result.warnings, stats: result.stats }, 200, NO_STORE);
  } catch (e) {
    if (e instanceof ImportError) return fail(e.message, e.code === "too_large" ? 413 : 400, { code: e.code });
    if (e instanceof TypeformError) return fail(e.message, e.status, { code: e.code });
    // Only a static label: a driver error could quote the insert.
    console.error("[api.forms.import]", e?.code || e?.name || "error");
    return fail("Couldn't import that form. Try again.", 500);
  }
}
