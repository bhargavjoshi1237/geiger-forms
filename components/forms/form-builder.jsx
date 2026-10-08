"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, CloudOff, FilePlus2, FileQuestion, Loader2, Redo2, RefreshCw, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { Button } from "@geiger/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@geiger/ui/tooltip";
import { cn } from "@/lib/utils";
import { serializeBuilderDoc } from "@/lib/forms/builder";
import { normalizeSettings, titleFromSlug } from "@/lib/forms/schema";
import { withPrefix } from "@/lib/workspace/base-path";
import { createForm, getFormById, getFormBySlug, setFormStatus, updateForm } from "@/lib/supabase/forms";
import { useVersions } from "@/lib/hooks/use-versions";
import { useCan } from "@/context/rbac-context";
import { useDocHistory } from "@/components/forms/builder/doc-history";
import { canonicalizeFields, convertLegacySteps, createField, duplicateField } from "@/components/forms/builder/field-defaults";
import { collectWarnings, hashString } from "@/components/forms/builder/doc-checks";
import { conditionSources } from "@/components/forms/builder/conditions-editor";
import { BuilderCanvas } from "@/components/forms/builder/builder-canvas";
import { BuilderSidebar } from "@/components/forms/builder/builder-sidebar";
import { BuilderPreview } from "@/components/forms/builder/builder-preview";
import { BuilderTopbarActions } from "@/components/forms/builder/builder-topbar";
import { useAutosave } from "@/components/forms/builder/use-autosave";
import { useBuilderPresence } from "@/components/forms/builder/use-builder-presence";

// Editor doc from a loaded form; legacy settings.steps become real page breaks once.
function buildDoc(form) {
  const fields = canonicalizeFields(form.fieldDefs);
  const settings = normalizeSettings(form.settings);
  const converted = convertLegacySteps(fields, settings.steps);
  return {
    doc: {
      title: form.title || "",
      description: form.description || "",
      fields: converted || fields,
      settings: converted ? { ...settings, steps: [] } : settings,
    },
    converted: Boolean(converted),
  };
}

function scrollToField(id) {
  requestAnimationFrame(() => {
    document.querySelector(`[data-field-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function insertAt(fields, field, { afterId, beforeId } = {}) {
  const next = [...fields];
  if (beforeId) {
    const i = next.findIndex((f) => f.id === beforeId);
    next.splice(i === -1 ? next.length : i, 0, field);
  } else if (afterId) {
    const i = next.findIndex((f) => f.id === afterId);
    next.splice(i === -1 ? next.length : i + 1, 0, field);
  } else {
    next.push(field);
  }
  return next;
}

function SaveStatus({ status }) {
  return (
    <span className={cn("flex items-center gap-1.5 text-xs", status === "error" ? "text-red-400" : "text-muted-foreground")}>
      {status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-text-secondary" /> : status === "error" ? <CloudOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-text-secondary" />}
      {status === "saving" ? "Saving…" : status === "error" ? "Save failed — retrying" : "Saved"}
    </span>
  );
}

function IconAction({ label, shortcut, onClick, disabled, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled} className="text-text-secondary">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label} <span className="ml-1 opacity-60">{shortcut}</span></TooltipContent>
    </Tooltip>
  );
}

function FormBuilderEditor({ form, backHref }) {
  const [initial] = useState(() => buildDoc(form));
  const baseSettings = form.settings;
  const { doc, set, undo, redo, canUndo, canRedo } = useDocHistory(initial.doc);
  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  const [selectedId, setSelectedId] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [status, setStatus] = useState(form.status);
  const [remoteUpdate, setRemoteUpdate] = useState(null);
  const canPublish = useCan("forms.form.publish");

  const serialize = useCallback(
    (d) => serializeBuilderDoc({ title: d.title, description: d.description, fields: d.fields, settings: d.settings, baseSettings }),
    [baseSettings],
  );
  const payload = useMemo(() => serialize(doc), [serialize, doc]);
  const signature = useMemo(() => JSON.stringify(payload), [payload]);
  const [initialSignature] = useState(() => (initial.converted ? "" : JSON.stringify(serialize(initial.doc))));

  // Co-editing: presence avatars plus "saved" broadcasts after each autosave.
  const { others, broadcastSaved } = useBuilderPresence(form.id, {
    onRemoteSave: (msg) => {
      if (!msg?.signature || msg.signature === hashString(signature)) return;
      setRemoteUpdate({ name: msg.name || "Someone", at: msg.at });
    },
  });
  const onSaved = useCallback((sig) => broadcastSaved(hashString(sig)), [broadcastSaved]);
  const { status: saveStatus, dirty, markSaved } = useAutosave({ formId: form.id, signature, initialSignature, onSaved });

  // --- Doc edits (all undoable) ---
  const setTitle = useCallback((title) => set((d) => ({ ...d, title }), "title"), [set]);
  const setDescription = useCallback((description) => set((d) => ({ ...d, description }), "description"), [set]);
  const updateSettings = useCallback((patch, key) => set((d) => ({ ...d, settings: { ...d.settings, ...patch } }), key), [set]);
  const updateField = useCallback(
    (id, patch) => set((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }), `field:${id}:${Object.keys(patch).sort().join()}`),
    [set],
  );
  const toggleIncluded = useCallback(
    (id) => set((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, included: f.included === false } : f)) })),
    [set],
  );

  const selectField = useCallback((id) => setSelectedId(id), []);
  const revealField = useCallback(
    (id) => {
      setPreviewing(false);
      setSelectedId(id);
      const field = docRef.current.fields.find((f) => f.id === id);
      if (field?.included === false) toast.message("This field is excluded — turn it back on in the Fields list to show it.");
      scrollToField(id);
    },
    [],
  );

  const insertField = useCallback(
    (type, position = {}) => {
      const field = createField(type, docRef.current.fields);
      set((d) => ({ ...d, fields: insertAt(d.fields, field, position) }));
      setSelectedId(field.id);
      scrollToField(field.id);
    },
    [set],
  );

  const duplicate = useCallback(
    (id) => {
      const source = docRef.current.fields.find((f) => f.id === id);
      if (!source) return;
      const copy = duplicateField(source, docRef.current.fields);
      set((d) => ({ ...d, fields: insertAt(d.fields, copy, { afterId: id }) }));
      setSelectedId(copy.id);
      scrollToField(copy.id);
    },
    [set],
  );

  const remove = useCallback(
    (id) => {
      const field = docRef.current.fields.find((f) => f.id === id);
      set((d) => ({ ...d, fields: d.fields.filter((f) => f.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));
      toast(`${field?.type === "page" ? "Page break" : `“${field?.title || "Field"}”`} deleted`, {
        action: { label: "Undo", onClick: () => undo() },
      });
    },
    [set, undo],
  );

  const move = useCallback(
    (fromId, beforeId) =>
      set((d) => {
        const item = d.fields.find((f) => f.id === fromId);
        if (!item) return d;
        const rest = d.fields.filter((f) => f.id !== fromId);
        return { ...d, fields: insertAt(rest, item, beforeId ? { beforeId } : {}) };
      }),
    [set],
  );

  // Keyboard undo / redo over the whole doc.
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || previewing) return;
      // Dialogs (version notes, publish) keep their own native undo.
      if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, previewing]);

  // Stable, structural list of condition sources so cards only re-render when it really changes.
  const sourcesKey = JSON.stringify(conditionSources(doc.fields).map((f) => ({ id: f.id, title: f.title, type: f.type, options: f.options })));
  const sources = useMemo(() => JSON.parse(sourcesKey), [sourcesKey]);
  const warnings = useMemo(() => collectWarnings({ fields: doc.fields, settings: doc.settings }), [doc.fields, doc.settings]);
  const scoring = Boolean(doc.settings.scoringEnabled);
  const quiz = Boolean(doc.settings.quiz?.enabled);
  const currency = doc.settings.payments?.currency || "usd";

  // --- Versions ---
  const { versions, loading: versionsLoading, save: saveVersionRow } = useVersions(form.id);
  const currentDoc = useMemo(() => ({ fields: payload.schema.fields, settings: payload.settings }), [payload]);
  const buildTarget = useCallback(
    (v) => ({
      fields: canonicalizeFields(v.schema?.fields),
      settings: normalizeSettings({ ...docRef.current.settings, ...(v.settings || {}) }),
    }),
    [],
  );

  const saveVersion = useCallback(
    async (notes) => {
      try {
        await saveVersionRow({ notes: notes || "Manual version save", schema: payload.schema, settings: payload.settings });
        toast.success("Version saved");
        return true;
      } catch (err) {
        console.error("[builder.saveVersion]", err);
        toast.error("Couldn't save the version.");
        return false;
      }
    },
    [saveVersionRow, payload],
  );

  const restoreVersion = useCallback(
    async (v) => {
      try {
        await saveVersionRow({ notes: `Before restore of ${v.label}`, schema: payload.schema, settings: payload.settings });
        const target = buildTarget(v);
        const nextDoc = { ...docRef.current, fields: target.fields, settings: target.settings };
        const nextPayload = serialize(nextDoc);
        await updateForm(form.id, nextPayload);
        const sig = JSON.stringify(nextPayload);
        markSaved(sig);
        set(nextDoc);
        setSelectedId(null);
        broadcastSaved(hashString(sig));
        toast.success(`Restored ${v.label}`, { description: "Your previous state was saved as a new version." });
        return true;
      } catch (err) {
        console.error("[builder.restore]", err);
        toast.error("Couldn't restore that version.");
        return false;
      }
    },
    [saveVersionRow, payload, buildTarget, serialize, form.id, markSaved, set, broadcastSaved],
  );

  const reloadRemote = async () => {
    try {
      const fresh = await getFormById(form.id);
      if (!fresh) throw new Error("Form not found");
      const next = buildDoc(fresh).doc;
      markSaved(JSON.stringify(serialize(next)));
      set(next);
      setStatus(fresh.status);
      setRemoteUpdate(null);
    } catch (err) {
      console.error("[builder.reload]", err);
      toast.error("Couldn't load the latest version.");
    }
  };

  const applyStatus = async (next) => {
    try {
      const updated = await setFormStatus(form.id, next);
      setStatus(updated?.status || next);
      toast.success(next === "Published" ? "Form is live" : "Form unpublished");
    } catch (err) {
      console.error("[builder.status]", err);
      toast.error("Couldn't change the form's status.");
    }
  };

  const history = { versions, loading: versionsLoading, currentDoc, buildTarget, onSave: saveVersion, onRestore: restoreVersion };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-full min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background text-foreground">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
          <Button type="button" variant="ghost" size="icon-sm" asChild>
            <Link href={backHref} aria-label="Back to forms"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">{doc.title || "Untitled form"}</h1>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <BuilderTopbarActions
              slug={form.slug}
              status={status}
              others={others}
              previewing={previewing}
              onTogglePreview={() => setPreviewing((v) => !v)}
              onStatusChange={applyStatus}
              warnings={warnings}
              onReviewWarning={(w) => w.fieldId && revealField(w.fieldId)}
              canPublish={canPublish}
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <main className="scrollbar-subtle relative min-w-0 flex-1 overflow-y-auto bg-background">
            {previewing ? (
              <BuilderPreview doc={doc} form={form} onExit={() => setPreviewing(false)} />
            ) : (
              <>
                <div className="sticky top-0 z-20 flex items-center gap-1 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
                  <IconAction label="Undo" shortcut="Ctrl+Z" onClick={undo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></IconAction>
                  <IconAction label="Redo" shortcut="Ctrl+Shift+Z" onClick={redo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></IconAction>
                  <div className="ml-auto flex items-center gap-3">
                    {warnings.length ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="xs" onClick={() => warnings[0].fieldId && revealField(warnings[0].fieldId)} className="h-auto gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-normal text-amber-400 hover:bg-amber-500/15 hover:text-amber-400 has-[>svg]:px-2">
                            <AlertTriangle className="size-3.5" />{warnings.length} to check
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-72">
                          {warnings.slice(0, 6).map((w) => <p key={w.id}>• {w.message}</p>)}
                          {warnings.length > 6 ? <p>…and {warnings.length - 6} more</p> : null}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    <SaveStatus status={saveStatus} />
                  </div>
                </div>

                {remoteUpdate ? (
                  <div className="sticky top-[49px] z-20 mx-4 mt-3 flex items-center gap-3 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300 backdrop-blur">
                    <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      Updated by <span className="font-medium">{remoteUpdate.name}</span>.
                      {dirty ? " Reloading replaces your unsaved edits." : " Reload to see their changes."}
                    </span>
                    <Button type="button" size="xs" variant="outline" onClick={reloadRemote}>Reload</Button>
                    <Button type="button" variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => setRemoteUpdate(null)} className="size-auto text-sky-300/70 hover:bg-transparent hover:text-sky-300"><X className="size-3.5" /></Button>
                  </div>
                ) : null}

                <BuilderCanvas
                  doc={doc}
                  selectedId={selectedId}
                  sources={sources}
                  scoring={scoring}
                  quiz={quiz}
                  currency={currency}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                  onSettingsChange={updateSettings}
                  onSelect={selectField}
                  onFieldChange={updateField}
                  onDuplicate={duplicate}
                  onDelete={remove}
                  onToggleIncluded={toggleIncluded}
                  onMove={move}
                  onInsert={insertField}
                />
              </>
            )}
          </main>

          {!previewing ? (
            <BuilderSidebar
              doc={doc}
              selectedId={selectedId}
              sources={sources}
              onInsert={insertField}
              onSelect={revealField}
              onToggleIncluded={toggleIncluded}
              onSettingsChange={updateSettings}
              history={history}
            />
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}

function CenteredState({ children }) {
  return <div className="flex h-full min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-3 bg-background px-6 text-center">{children}</div>;
}

function NotFoundState({ slug, projectId, backHref, onCreated }) {
  const [busy, setBusy] = useState(false);
  const canCreate = useCan("forms.form.edit");
  const create = async () => {
    setBusy(true);
    try {
      const created = await createForm({ title: titleFromSlug(slug) || "Untitled form", slug, projectId: projectId || null });
      toast.success("Form created");
      onCreated(created);
    } catch (err) {
      console.error("[builder.create]", err);
      toast.error("Couldn't create the form.");
      setBusy(false);
    }
  };
  return (
    <CenteredState>
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface-subtle text-text-secondary"><FileQuestion className="h-6 w-6" /></span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">Form not found</p>
        <p className="max-w-sm text-sm text-text-secondary">
          There&apos;s no form at <code className="rounded bg-surface-card px-1 font-mono text-xs">/forms/{slug}</code>. It may have been deleted, or the link is wrong.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}><ArrowLeft className="h-4 w-4" />Back to forms</Link>
        </Button>
        <Button type="button" onClick={create} disabled={busy || !canCreate}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}Create this form
        </Button>
      </div>
    </CenteredState>
  );
}

// Loads the form by slug, then mounts the editor (or a not-found / error state).
export function FormBuilder({ formId, projectId = null, backHref = withPrefix("/forms?view=Forms"), onLoaded }) {
  const router = useRouter();
  const [state, setState] = useState({ slug: formId, status: "loading", form: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getFormBySlug(formId)
      .then((form) => active && setState({ slug: formId, status: form ? "ready" : "missing", form }))
      .catch((err) => {
        console.error("[builder.load]", err);
        if (active) setState({ slug: formId, status: "error", form: null });
      });
    return () => {
      active = false;
    };
  }, [formId, attempt]);

  const loaded = state.form;
  useEffect(() => {
    if (loaded) onLoaded?.(loaded);
  }, [loaded, onLoaded]);

  const current = state.slug === formId ? state : { status: "loading" };

  if (current.status === "error") {
    return (
      <CenteredState>
        <AlertTriangle className="h-6 w-6 text-amber-400" />
        <p className="font-medium text-foreground">Couldn&apos;t load this form</p>
        <p className="max-w-sm text-xs text-text-secondary">Refresh the page or try again shortly.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setState({ slug: formId, status: "loading", form: null });
            setAttempt((n) => n + 1);
          }}
        >
          Retry
        </Button>
      </CenteredState>
    );
  }

  if (current.status === "missing") {
    return (
      <NotFoundState
        slug={formId}
        projectId={projectId}
        backHref={backHref}
        onCreated={(created) => {
          if (created.slug !== formId) router.replace(withPrefix(`/forms/${created.slug}`));
          else setState({ slug: formId, status: "ready", form: created });
        }}
      />
    );
  }

  if (current.status !== "ready") {
    return (
      <CenteredState>
        <LogoLoading size={88} />
      </CenteredState>
    );
  }

  return <FormBuilderEditor key={current.form.id} form={current.form} backHref={backHref} />;
}
