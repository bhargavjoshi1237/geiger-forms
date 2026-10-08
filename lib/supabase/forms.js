import { schemaClient } from "@/supabase/components/forms-client";
import { normalizeForm, slugify, defaultSettings } from "@/lib/forms/schema";
import { logActivity } from "@/lib/supabase/audit";

const TABLE = "forms";

const WRITABLE = ["slug", "title", "description", "status", "category", "tags", "schema", "settings", "published_at", "project_id", "is_template", "metadata"];

function pickWritable(patch) {
  const out = {};
  for (const key of WRITABLE) {
    if (key in patch) out[key] = patch[key];
  }
  if ("projectId" in patch) out.project_id = patch.projectId ?? null;
  if ("isTemplate" in patch) out.is_template = Boolean(patch.isTemplate);
  return out;
}

// Live forms for a workspace; `projectId` undefined lists everything (legacy /forms), null lists unscoped forms.
export async function listForms({ projectId, templates = false } = {}) {
  const supabase = schemaClient();
  let query = supabase
    .from(TABLE)
    .select("*")
    .is("deleted_at", null)
    .eq("is_template", templates)
    .order("updated_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  else if (projectId === null) query = query.is("project_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeForm);
}

export async function getFormBySlug(slug) {
  const supabase = schemaClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("slug", slug).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return normalizeForm(data);
}

export async function getFormById(id) {
  const supabase = schemaClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return normalizeForm(data);
}

export async function getPublishedFormBySlug(slug) {
  const supabase = schemaClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("status", "Published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return normalizeForm(data);
}

export async function createForm({ title, slug, category = null, tags = [], schema, settings, projectId = null, isTemplate = false, description = "" }) {
  const supabase = schemaClient();
  const baseSlug = slug || slugify(title) || "untitled-form";
  const uniqueSlug = await ensureUniqueSlug(baseSlug);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      slug: uniqueSlug,
      title: title || "Untitled form",
      description,
      category,
      tags,
      schema: schema || { fields: [] },
      settings: settings || defaultSettings(),
      status: "Draft",
      project_id: projectId,
      is_template: isTemplate,
    })
    .select("*")
    .single();
  if (error) throw error;
  const form = normalizeForm(data);
  logActivity({ projectId, formId: form.id, action: isTemplate ? "template.created" : "form.created", detail: { title: form.title } });
  return form;
}

export async function updateForm(id, patch) {
  const supabase = schemaClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(pickWritable(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeForm(data);
}

// Shallow-merges a settings patch server-side so one editor section never clobbers another.
export async function mergeFormSettings(id, patch) {
  const supabase = schemaClient();
  const { error } = await supabase.rpc("merge_settings", { p_id: id, p_patch: patch });
  if (error) throw error;
  return getFormById(id);
}

export async function saveFormBySlug(slug, doc) {
  const supabase = schemaClient();
  const existing = await getFormBySlug(slug);
  if (existing) {
    return updateForm(existing.id, doc);
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...pickWritable(doc), slug, title: doc.title || "Untitled form" })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeForm(data);
}

export async function setFormStatus(id, status) {
  const patch = { status };
  if (status === "Published") patch.published_at = new Date().toISOString();
  const form = await updateForm(id, patch);
  logActivity({ projectId: form.projectId, formId: id, action: `form.${status.toLowerCase()}`, detail: { title: form.title } });
  return form;
}

// Soft delete (the row stays recoverable until purged).
export async function deleteForm(id) {
  const supabase = schemaClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, project_id")
    .maybeSingle();
  if (error) throw error;
  logActivity({ projectId: data?.project_id ?? null, formId: id, action: "form.deleted", detail: { title: data?.title } });
}

// Copies a form (or template) into a new draft; `asTemplate` saves the copy as a reusable template.
export async function duplicateForm(id, { title, projectId, asTemplate = false } = {}) {
  const source = await getFormById(id);
  if (!source) throw new Error("Form not found");
  return createForm({
    title: title || (asTemplate ? source.title : `${source.title} (copy)`),
    description: source.description,
    category: source.category,
    tags: source.tags,
    schema: { fields: source.fieldDefs },
    settings: { ...source.settings, sharing: [], template: asTemplate ? null : source.isTemplate ? source.id : source.settings.template },
    projectId: projectId !== undefined ? projectId : source.projectId,
    isTemplate: asTemplate,
  });
}

async function ensureUniqueSlug(base) {
  const supabase = schemaClient();
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    const { data } = await supabase.from(TABLE).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
