"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listForms,
  createForm,
  updateForm,
  deleteForm,
  setFormStatus,
} from "@/lib/supabase/forms";

export function useForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setForms(await listForms());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const create = useCallback(async (input) => {
    const form = await createForm(input);
    setForms((cur) => [form, ...cur]);
    return form;
  }, []);

  const update = useCallback(async (id, patch) => {
    const form = await updateForm(id, patch);
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

  return { forms, loading, error, refresh, create, update, remove, changeStatus };
}
