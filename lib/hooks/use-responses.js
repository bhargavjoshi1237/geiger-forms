"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignResponses,
  listResponses,
  updateResponse,
  updateResponses,
  retagResponses,
  deleteResponses,
} from "@/lib/supabase/responses";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";

export { labelAnswers } from "@/lib/forms/logic";

// Responses for one form, or for the whole current workspace.
export function useResponses({ formId } = {}) {
  const { projectId } = useWorkspaceUrl();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestAssign = useRef(new Map());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResponses(await listResponses({ formId, projectId: formId ? undefined : projectId || undefined }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [formId, projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const replace = (rows) => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    setResponses((cur) => cur.map((r) => byId.get(r.id) || r));
  };

  // Optimistic single-row patch; rolls back and rethrows on failure.
  const patch = useCallback(async (id, changes) => {
    let previous;
    setResponses((cur) => cur.map((r) => (r.id === id ? ((previous = r), { ...r, ...changes }) : r)));
    try {
      const updated = await updateResponse(id, changes);
      setResponses((cur) => cur.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (err) {
      if (previous) setResponses((cur) => cur.map((r) => (r.id === id ? previous : r)));
      throw err;
    }
  }, []);

  const changeStatus = useCallback((id, status) => patch(id, { status }), [patch]);

  // Optimistic assignment to a member (null unassigns); rolls back and rethrows on failure. Only a row's latest assignment applies its result.
  const assign = useCallback(async (ids, member) => {
    const request = {};
    ids.forEach((id) => latestAssign.current.set(id, request));
    const isLatest = (id) => latestAssign.current.get(id) === request;
    const previous = new Map();
    const changes = { assigneeId: member?.id ?? null, assignee: member?.name ?? "" };
    setResponses((cur) => cur.map((r) => (ids.includes(r.id) ? (previous.set(r.id, r), { ...r, ...changes }) : r)));
    try {
      const rows = await assignResponses(ids, changes.assigneeId);
      replace(rows.filter((r) => isLatest(r.id)));
      return rows;
    } catch (err) {
      setResponses((cur) => cur.map((r) => (isLatest(r.id) && previous.get(r.id)) || r));
      throw err;
    }
  }, []);

  const bulkUpdate = useCallback(async (ids, changes) => {
    const rows = await updateResponses(ids, changes);
    replace(rows);
    return rows;
  }, []);

  const bulkTag = useCallback(async (rows, change) => {
    const updated = await retagResponses(rows, change);
    replace(updated);
    return updated;
  }, []);

  const remove = useCallback(async (ids) => {
    await deleteResponses(ids);
    setResponses((cur) => cur.filter((r) => !ids.includes(r.id)));
  }, []);

  return { responses, setResponses, loading, error, refresh, patch, changeStatus, assign, bulkUpdate, bulkTag, remove };
}
