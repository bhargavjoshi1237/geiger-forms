"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WORKSPACE_SETTINGS, getWorkspaceSettings, saveWorkspaceSettings } from "@/lib/supabase/workspace_settings";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";

// Workspace-level settings row for the current project (folders, defaults, branding, saved themes…); `scope` pins another project, e.g. a form's.
export function useWorkspaceSettings(scope) {
  const { projectId: routeProjectId } = useWorkspaceUrl();
  const projectId = scope === undefined ? routeProjectId : scope;
  const [settings, setSettings] = useState(DEFAULT_WORKSPACE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await getWorkspaceSettings(projectId || null));
    } catch (err) {
      console.error("[workspace_settings.load]", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Optimistic save of the changed keys only; rolls back and rethrows on failure.
  const save = useCallback(
    async (next) => {
      const previous = settings;
      setSettings({ ...previous, ...next });
      try {
        const saved = await saveWorkspaceSettings(projectId || null, next);
        setSettings(saved);
        return saved;
      } catch (err) {
        setSettings(previous);
        throw err;
      }
    },
    [projectId, settings],
  );

  return { settings, loading, error, refresh, save, projectId };
}
