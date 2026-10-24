import { schemaClient } from "@/supabase/components/forms-client";
import { relativeTime } from "@/lib/forms/schema";
import { callApi } from "@/lib/forms/api";
import { memberInitials } from "@/lib/supabase/rbac";

const TABLE = "comments";

// `author` is the display-name snapshot; `authorId` and `mentions` are member user ids.
function normalizeComment(row) {
  return {
    id: row.id,
    responseId: row.response_id,
    author: row.author || "You",
    authorId: row.author_id ?? null,
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    initials: memberInitials(row.author),
    body: row.body,
    createdAt: row.created_at,
    when: relativeTime(row.created_at),
  };
}

export async function listComments(responseId) {
  const supabase = schemaClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("response_id", responseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeComment);
}

// Posted through the server so the author is the signed-in member and @mentioned members are notified.
export async function createComment({ responseId, body, mentions = [] }) {
  const { ok, data } = await callApi(`/api/responses/${responseId}/comments`, { method: "POST", body: { body, mentions } });
  if (!ok) throw new Error(data?.error || "Couldn't post your comment.");
  return normalizeComment(data.comment);
}
