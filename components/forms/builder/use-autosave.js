"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mergeFormSettings, updateForm } from "@/lib/supabase/forms";

const DEBOUNCE_MS = 1000;
const RETRY_MS = 5000;

function changedSettings(next, prev) {
  const patch = {};
  for (const key of Object.keys(next || {})) {
    if (JSON.stringify(next[key]) !== JSON.stringify(prev?.[key])) patch[key] = next[key];
  }
  return patch;
}

// Writes the doc; settings go through the shallow server merge so keys edited elsewhere aren't clobbered.
async function persist(formId, payload, previous) {
  const { settings, ...rest } = payload;
  await updateForm(formId, rest);
  const patch = changedSettings(settings, previous?.settings);
  if (Object.keys(patch).length === 0) return;
  try {
    await mergeFormSettings(formId, patch);
  } catch {
    await updateForm(formId, { settings });
  }
}

// Debounced autosave keyed on the serialized doc signature.
export function useAutosave({ formId, signature, initialSignature, onSaved }) {
  const [savedSignature, setSavedSignature] = useState(initialSignature);
  const [failedSignature, setFailedSignature] = useState(null);
  const [initialPayload] = useState(() => (initialSignature ? JSON.parse(initialSignature) : null));
  const lastSavedRef = useRef(initialPayload);
  const inFlightRef = useRef(false);

  const save = useCallback(
    async (sig) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const payload = JSON.parse(sig);
        await persist(formId, payload, lastSavedRef.current);
        lastSavedRef.current = payload;
        setFailedSignature(null);
        setSavedSignature(sig);
        onSaved?.(sig);
      } catch (err) {
        console.error("[builder.autosave]", err);
        setFailedSignature(sig);
      } finally {
        inFlightRef.current = false;
      }
    },
    [formId, onSaved],
  );

  useEffect(() => {
    if (signature === savedSignature) return undefined;
    const timer = setTimeout(() => save(signature), failedSignature === signature ? RETRY_MS : DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [signature, savedSignature, failedSignature, save]);

  const dirty = signature !== savedSignature;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Records a doc that was written by another path (restore, reload) as saved.
  const markSaved = useCallback((sig) => {
    lastSavedRef.current = JSON.parse(sig);
    setFailedSignature(null);
    setSavedSignature(sig);
  }, []);

  const status = !dirty ? "saved" : failedSignature === signature ? "error" : "saving";
  return { status, dirty, markSaved, savedSignature };
}
