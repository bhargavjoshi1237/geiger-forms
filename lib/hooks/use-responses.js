"use client";

import { useCallback, useEffect, useState } from "react";
import { listResponses, updateResponseStatus } from "@/lib/supabase/responses";

export function useResponses({ formId } = {}) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResponses(await listResponses({ formId }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const changeStatus = useCallback(async (id, status) => {
    const updated = await updateResponseStatus(id, status);
    setResponses((cur) => cur.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  return { responses, loading, error, refresh, changeStatus };
}

export function labelAnswers(answers, fieldDefs) {
  const out = {};
  for (const field of fieldDefs || []) {
    if (field.type === "calculated") continue;
    const value = answers?.[field.id];
    if (value === undefined || value === null || value === "") continue;
    out[field.label || field.title || field.id] = String(value);
  }
  return out;
}
