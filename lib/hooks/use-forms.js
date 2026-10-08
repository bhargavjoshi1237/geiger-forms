"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listForms,
  createForm,
  updateForm,
  deleteForm,
  setFormStatus,
  duplicateForm,
  mergeFormSettings,
} from "@/lib/supabase/forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";

// Forms for the current workspace: scoped to /project/<id>, everything on the legacy /forms entry.
export function useForms({ templates = false } = {}) {
  const { projectId } = useWorkspaceUrl();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setForms(await listForms({ projectId: projectId || undefined, templates }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, templates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input) => {
      const form = await createForm({ projectId: projectId || null, ...input });
      if (Boolean(form.isTemplate) === templates) setForms((cur) => [form, ...cur]);
      return form;
    },
    [projectId, templates],
  );

  const update = useCallback(async (id, patch) => {
    const form = await updateForm(id, patch);
    setForms((cur) => cur.map((f) => (f.id === id ? form : f)));
    return form;
  }, []);

  const mergeSettings = useCallback(async (id, patch) => {
    const form = await mergeFormSettings(id, patch);
    setForms((cur) => cur.map((f) => (f.id === id ? form : f)));
    return form;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteForm(id);
    setForms((cur) => cur.filter((f) => f.id !== id));
  }, []);

  const changeStatus = useCallback(async (id, status) => {
    const form = await setFormStatus(id, status);
    setForms((cur) => cur.map((f) => (f.id === id ? form : f)));
    return form;
  }, []);

  const duplicate = useCallback(
    async (id, opts = {}) => {
      const form = await duplicateForm(id, { projectId: projectId || null, ...opts });
      if (Boolean(form.isTemplate) === templates) setForms((cur) => [form, ...cur]);
      return form;
    },
    [projectId, templates],
  );

  return { forms, loading, error, refresh, create, update, mergeSettings, remove, changeStatus, duplicate, projectId };
}
