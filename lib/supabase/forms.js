import { createClient } from "./client";
import { normalizeForm, slugify, defaultSettings } from "@/lib/forms/schema";

const TABLE = "geiger_forms";

const WRITABLE = ["slug", "title", "description", "status", "category", "tags", "schema", "settings", "published_at"];

function pickWritable(patch) {
  const out = {};
  for (const key of WRITABLE) {
    if (key in patch) out[key] = patch[key];
  }
  return out;
}

export async function listForms() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeForm);
}

export async function getFormBySlug(slug) {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return normalizeForm(data);
}

export async function getPublishedFormBySlug(slug) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("status", "Published")
    .maybeSingle();
  if (error) throw error;
  return normalizeForm(data);
}

export async function createForm({ title, slug, category = null, tags = [], schema, settings }) {
  const supabase = createClient();
  const baseSlug = slug || slugify(title) || "untitled-form";
  const uniqueSlug = await ensureUniqueSlug(baseSlug);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      slug: uniqueSlug,
      title: title || "Untitled form",
      category,
      tags,
      schema: schema || { fields: [] },
      settings: settings || defaultSettings(),
      status: "Draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeForm(data);
}

export async function updateForm(id, patch) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(pickWritable(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeForm(data);
}

export async function saveFormBySlug(slug, doc) {
  const supabase = createClient();
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
  return updateForm(id, patch);
}

export async function deleteForm(id) {
  const supabase = createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

async function ensureUniqueSlug(base) {
  const supabase = createClient();
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    const { data } = await supabase.from(TABLE).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
