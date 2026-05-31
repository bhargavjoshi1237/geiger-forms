"use client";

import { useCallback, useEffect, useState } from "react";
import { listComments, createComment } from "@/lib/supabase/comments";

export function useComments(responseId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!responseId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setComments(await listComments(responseId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [responseId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (body, author) => {
      const created = await createComment({ responseId, body, author });
      setComments((cur) => [...cur, created]);
      return created;
    },
    [responseId],
  );

  return { comments, loading, error, refresh, add };
}
