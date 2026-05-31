import { createClient } from "./client";
import { relativeTime } from "@/lib/forms/schema";

const TABLE = "geiger_form_responses";

function initials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

function normalizeResponse(row) {
  return {
    id: row.id,
    formId: row.form_id,
    form: row.geiger_forms?.title || "Form",
    formSlug: row.geiger_forms?.slug || null,
    name: row.respondent_name || "Anonymous",
    email: row.respondent_email || "",
    answers: row.answers || {},
    status: row.status || "Complete",
    priority: row.priority || "Low",
    score: row.score ?? null,
    submittedAt: row.submitted_at,
    received: relativeTime(row.submitted_at),
    userAgent: row.user_agent || null,
    completionMs: row.completion_ms ?? null,
    initials: initials(row.respondent_name, row.respondent_email),
  };
}

export async function listResponses({ formId } = {}) {
  const supabase = createClient();
  let query = supabase
    .from(TABLE)
    .select("*, geiger_forms(title, slug)")
    .order("submitted_at", { ascending: false });
  if (formId) query = query.eq("form_id", formId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeResponse);
}

export async function createResponse({
  formId,
  answers,
  respondentName = null,
  respondentEmail = null,
  status = "Complete",
  priority = "Low",
  score = null,
  completionMs = null,
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      form_id: formId,
      answers,
      respondent_name: respondentName,
      respondent_email: respondentEmail,
      status,
      priority,
      score,
      completion_ms: completionMs,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeResponse(data);
}

export async function updateResponseStatus(id, status) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq("id", id)
    .select("*, geiger_forms(title, slug)")
    .single();
  if (error) throw error;
  return normalizeResponse(data);
}

export function summarizeResponses(responses) {
  const byStatus = { Complete: 0, "Needs review": 0, Pending: 0 };
  const byPriority = { High: 0, Medium: 0, Low: 0 };
  const respondents = new Set();
  for (const r of responses) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    if (r.email) respondents.add(r.email.toLowerCase());
  }
  const total = responses.length;
  const completePct = total ? Math.round((byStatus.Complete / total) * 100) : 0;
  return { total, byStatus, byPriority, respondents: respondents.size, completePct };
}
