"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WORKSPACE_SETTINGS, getWorkspaceSettings, saveWorkspaceSettings } from "@/lib/supabase/workspace_settings";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";

// Workspace-level settings row for the current project (folders, defaults, branding…).
export function useWorkspaceSettings() {
  const { projectId } = useWorkspaceUrl();
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

  // Optimistic save; rolls back and rethrows on failure.
  const save = useCallback(
    async (next) => {
      const previous = settings;
      setSettings({ ...previous, ...next });
      try {
        const saved = await saveWorkspaceSettings(projectId || null, { ...previous, ...next });
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

// Folder names: saved workspace folders plus any category already used by a form.
export function folderNames(settings, forms = []) {
  const set = new Set((settings?.folders || []).map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean));
  for (const f of forms) if (f.category) set.add(f.category);
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Layers workspace defaults (privacy, spam, branding, locale) onto a new form's settings.
export function applyWorkspaceDefaults(settings, ws) {
  if (!ws) return settings;
  const s = { ...settings };
  if (ws.defaultRetentionDays && !s.retentionDays) s.retentionDays = ws.defaultRetentionDays;
  if (ws.requireCaptcha) s.spam = { ...(s.spam || {}), captcha: true };
  if (ws.anonymiseByDefault) s.anonymous = true;
  if (ws.hideBranding) s.branding = false;
  if (ws.brandAccent && !s.theme?.accent) s.theme = { ...(s.theme || {}), accent: ws.brandAccent };
  if (ws.brandLogoUrl && !s.logoUrl) s.logoUrl = ws.brandLogoUrl;
  if (ws.locale && (!s.locale || s.locale === "en")) s.locale = ws.locale;
  return s;
}
