import { createClient } from "./client";
import { relativeTime } from "@/lib/forms/schema";

const TABLE = "geiger_form_comments";

function commentInitials(author) {
  const source = (author || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

function normalizeComment(row) {
  return {
    id: row.id,
    responseId: row.response_id,
    author: row.author || "You",
    initials: commentInitials(row.author),
    body: row.body,
    createdAt: row.created_at,
    when: relativeTime(row.created_at),
  };
}

export async function listComments(responseId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("response_id", responseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeComment);
}

export async function createComment({ responseId, body, author = "You" }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ response_id: responseId, body, author })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeComment(data);
}
