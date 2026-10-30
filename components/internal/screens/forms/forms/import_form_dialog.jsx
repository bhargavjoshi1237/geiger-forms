"use client";

import { useState } from "react";
import { AlertTriangle, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { FileInput } from "@geiger/ui/file-input";
import { Field } from "@geiger/ui/screen-kit";
import { SegmentedTabs } from "@geiger/ui/segmented-tabs";
import { callApi } from "@/lib/forms/api";
import { IMPORT_LIMITS } from "@/lib/forms/import/core";
import { exportFormJson } from "@/lib/forms/import/generic";
import { Note, TextInput } from "./sections/kit";

const SOURCES = [
  { value: "typeform", label: "Typeform" },
  { value: "json", label: "Geiger JSON" },
  { value: "csv", label: "CSV" },
];

const FILE_ACCEPT = { json: ".json,application/json", csv: ".csv,text/csv" };
const TOKEN_DOCS = "https://www.typeform.com/developers/get-started/personal-access-token/";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Saves a form as the JSON file the Geiger JSON import reads back.
export function downloadFormJson(form) {
  const blob = new Blob([JSON.stringify(exportFormJson(form), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${form.slug || "form"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function PreviewPanel({ preview }) {
  const { form, warnings, stats } = preview;
  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-card p-3">
        <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{form.title}</p>
          <p className="text-xs text-text-secondary">
            {plural(stats.fieldCount, "field")}
            {stats.layoutCount ? `, ${plural(stats.layoutCount, "layout block")}` : ""} · imports as a draft
          </p>
        </div>
      </div>
      {warnings.length ? (
        <div className="grid gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" /> {plural(warnings.length, "thing")} changed or left out
          </p>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-surface-card">
            <ul className="divide-y divide-border">
              {warnings.map((w, i) => (
                <li key={i} className="break-words px-3 py-2 text-xs leading-5 text-text-secondary">
                  {w.field ? <span className="font-medium text-foreground">{w.field}: </span> : null}
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <Note tone="success" icon={ShieldCheck}>
          Everything in this form carried over.
        </Note>
      )}
    </div>
  );
}

// Import a form from Typeform, a Geiger JSON export or a CSV: preview with warnings, then create a draft.
export function ImportFormDialog({ open, onClose, projectId, onImported }) {
  const [source, setSource] = useState("typeform");
  const [formRef, setFormRef] = useState("");
  const [token, setToken] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFormRef("");
    setToken("");
    setFile(null);
    setPreview(null);
    setError("");
  };

  const close = () => {
    if (busy) return;
    reset();
    setSource("typeform");
    onClose();
  };

  const changeSource = (next) => {
    reset();
    setSource(next);
  };

  const buildRequest = async () => {
    if (source === "typeform") return { source, form: formRef, token };
    if (file.size > IMPORT_LIMITS.maxInputBytes) throw new Error("That file is too large to import (2 MB limit).");
    return { source, text: await file.text(), title: file.name.replace(/\.[^.]+$/, "") };
  };

  const runPreview = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { ok, data } = await callApi("/api/forms/import", { method: "POST", body: { projectId, ...(await buildRequest()) } });
      if (!ok) {
        setError(data?.error || "Couldn't read that form.");
        return;
      }
      setPreview({ form: data.form, warnings: data.warnings || [], stats: data.stats || { fieldCount: 0, layoutCount: 0 } });
      // The token did its one job; confirming sends the previewed draft, not the token.
      setToken("");
    } catch (e) {
      setError(e?.message || "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const { ok, data } = await callApi("/api/forms/import", { method: "POST", body: { projectId, source: "draft", draft: preview.form, commit: true } });
    setBusy(false);
    if (!ok) {
      setError(data?.error || "Couldn't create the draft.");
      toast.error("Couldn't create the draft.");
      return;
    }
    reset();
    setSource("typeform");
    onImported(data.form);
  };

  const ready = source === "typeform" ? formRef.trim() && token.trim() : Boolean(file);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import a form</DialogTitle>
          <DialogDescription>Bring a form&apos;s questions and logic in as a draft. Responses aren&apos;t imported.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4">
          {preview ? (
            <PreviewPanel preview={preview} />
          ) : (
            <>
              <SegmentedTabs tabs={SOURCES} value={source} onChange={changeSource} fullWidth />
              {source === "typeform" ? (
                <>
                  <Field label="Typeform link or form id" htmlFor="import-typeform-form">
                    <TextInput id="import-typeform-form" value={formRef} onChange={setFormRef} placeholder="https://yourname.typeform.com/to/abc123" autoComplete="off" spellCheck={false} />
                  </Field>
                  <Field label="Personal access token" htmlFor="import-typeform-token">
                    <TextInput id="import-typeform-token" type="password" value={token} onChange={setToken} autoComplete="off" spellCheck={false} />
                  </Field>
                  <Note icon={ShieldCheck}>
                    Create a token in your Typeform account settings under Personal tokens, with the forms:read scope (add themes:read to bring the theme across).{" "}
                    <a href={TOKEN_DOCS} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                      How to get a token
                    </a>
                    . It&apos;s used for this one request and is never saved.
                  </Note>
                </>
              ) : (
                <Field label={source === "json" ? "Geiger form export (.json)" : "CSV file"} htmlFor="import-file" hint={source === "csv" ? "Each column header becomes a field, with its type guessed from the rows." : "Export a form to JSON from its row menu in All Forms."}>
                  <FileInput id="import-file" key={source} accept={FILE_ACCEPT[source]} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </Field>
              )}
            </>
          )}
          {error ? (
            <Note tone="warning" icon={AlertTriangle}>
              {error}
            </Note>
          ) : null}
        </div>
        <DialogFooter>
          {preview ? (
            <Button variant="ghost" type="button" onClick={() => setPreview(null)} disabled={busy}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" type="button" onClick={close} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button type="button" onClick={preview ? confirm : runPreview} disabled={busy || (!preview && !ready)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {preview ? "Import as draft" : "Preview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
