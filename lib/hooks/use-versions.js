"use client";

import { useCallback, useEffect, useState } from "react";
import { listVersions, createVersion } from "@/lib/supabase/versions";

export function useVersions(formId) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!formId) {
      setVersions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setVersions(await listVersions(formId));
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

  const save = useCallback(
    async (input) => {
      const created = await createVersion({ formId, ...input });
      await refresh();
      return created;
    },
    [formId, refresh],
  );

  return { versions, loading, error, refresh, save };
}
