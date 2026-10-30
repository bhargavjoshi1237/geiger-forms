"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { FileInput } from "@geiger/ui/file-input";
import { Progress } from "@geiger/ui/progress";
import { cn } from "@/lib/utils";
import { fieldIds } from "./field-shell";
import { formatBytes, matchesAccept, uploadToForm } from "./upload";

let uploadSeq = 0;

// Multi-file upload with size/type validation and per-file progress; answer is [{ name, path, size, type }].
export function FileField({ field, value, onChange, disabled, aria, slug, tr }) {
  const cfg = field.config || {};
  const maxFiles = Math.max(1, Number(cfg.maxFiles) || 1);
  const maxSizeMb = Number(cfg.maxSizeMb) || 10;
  const accept = cfg.accept || "";
  const files = Array.isArray(value) ? value.filter((f) => f && typeof f === "object") : [];
  const [pending, setPending] = useState([]);
  const [problems, setProblems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("");
  const latest = useRef(files);
  const inputRef = useRef(null);
  const chooseRef = useRef(null);
  const listRef = useRef(null);
  const ids = fieldIds(field);
  const preview = !slug;
  const locked = disabled || field.readOnly || preview;
  const remaining = maxFiles - files.length - pending.length;

  useEffect(() => {
    latest.current = Array.isArray(value) ? value : [];
  }, [value]);

  const addFiles = async (list) => {
    if (locked) return;
    const incoming = Array.from(list || []);
    const issues = [];
    const accepted = [];
    for (const file of incoming) {
      if (accepted.length >= remaining) {
        issues.push(tr("maxFiles", { count: maxFiles }));
        break;
      }
      if (file.size > maxSizeMb * 1024 * 1024) issues.push(tr("fileTooLarge", { name: file.name, size: maxSizeMb }));
      else if (!matchesAccept(file, accept)) issues.push(tr("fileTypeNotAllowed", { name: file.name }));
      else accepted.push(file);
    }
    setProblems(issues);
    const jobs = accepted.map((file) => ({ key: `u${(uploadSeq += 1)}`, file, name: file.name, size: file.size, progress: 0 }));
    setPending((cur) => [...cur, ...jobs]);
    // Reaching the file limit removes the button that had focus, so hand focus to the file list.
    if (jobs.length && remaining - jobs.length <= 0) requestAnimationFrame(() => listRef.current?.focus());
    await Promise.all(
      jobs.map(async (job) => {
        const result = await uploadToForm(slug, field.id, job.file, {
          onProgress: (p) => setPending((cur) => cur.map((j) => (j.key === job.key ? { ...j, progress: p } : j))),
        });
        setPending((cur) => cur.filter((j) => j.key !== job.key));
        if (result.file) {
          const next = [...(latest.current || []), result.file];
          latest.current = next;
          onChange(next);
          setStatus(tr("uploaded", { name: job.name }));
        } else {
          setProblems((cur) => [...cur, `${job.name}: ${result.error || tr("uploadFailed")}`]);
        }
      }),
    );
  };

  const removeAt = (index) => {
    const next = files.filter((_, i) => i !== index);
    latest.current = next;
    onChange(next.length ? next : undefined);
    setStatus(`${tr("removeRow")} ${files[index]?.name || ""}`);
    requestAnimationFrame(() => chooseRef.current?.focus());
  };

  return (
    <div className="grid gap-2">
      <p role="status" className="sr-only">
        {status}
      </p>
      {remaining > 0 && (
        <div
          onDragOver={(e) => {
            if (locked) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border-strong bg-surface-card",
            locked && "opacity-70",
          )}
        >
          <UploadCloud className="size-6 text-text-tertiary" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-text-secondary">
            {/* The visible button is the control: the file input is hidden from the tab order and from assistive tech. */}
            <Button
              ref={chooseRef}
              id={ids.control}
              type="button"
              size="sm"
              variant="outline"
              disabled={locked}
              aria-labelledby={`${ids.control} ${ids.label}`}
              aria-describedby={aria?.["aria-describedby"]}
              aria-invalid={aria?.["aria-invalid"]}
              onClick={() => inputRef.current?.click()}
            >
              <Paperclip />
              {maxFiles > 1 ? tr("uploadFiles") : tr("uploadFile")}
            </Button>
            <span className="hidden sm:inline">{tr("dropFiles")}</span>
          </div>
          <p className="text-[11px] text-text-tertiary">
            {[accept && accept.replace(/,/g, ", "), `≤ ${maxSizeMb} MB`, maxFiles > 1 && tr("maxFiles", { count: maxFiles })].filter(Boolean).join(" · ")}
          </p>
          {preview && <p className="text-[11px] text-text-tertiary">{tr("previewOnly")}</p>}
          <FileInput
            ref={inputRef}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            multiple={maxFiles > 1}
            accept={accept || undefined}
            disabled={locked}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {(files.length > 0 || pending.length > 0) && (
        <ul ref={listRef} tabIndex={-1} aria-labelledby={ids.label} className="grid gap-1.5 outline-none">
          {files.map((f, i) => (
            <li key={`${f.path || f.name}-${i}`} className="flex items-center gap-2.5 rounded-md border border-border bg-surface-card px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-foreground [overflow-wrap:anywhere]">{f.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-text-tertiary">{formatBytes(f.size)}</span>
              {!disabled && !field.readOnly && (
                <Button type="button" size="icon-xs" variant="ghost" aria-label={`${tr("removeRow")} ${f.name}`} onClick={() => removeAt(i)}>
                  <X />
                </Button>
              )}
            </li>
          ))}
          {pending.map((job) => (
            <li key={job.key} className="grid gap-1.5 rounded-md border border-border bg-surface-card px-3 py-2 text-sm">
              <div className="flex items-center gap-2.5">
                <Loader2 className="size-4 shrink-0 animate-spin text-text-tertiary" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-foreground [overflow-wrap:anywhere]">{job.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-text-tertiary">{Math.round(job.progress * 100)}%</span>
              </div>
              <Progress value={Math.max(4, Math.round(job.progress * 100))} aria-label={`${tr("uploading")} ${job.name}`} aria-valuenow={Math.round(job.progress * 100)} className="h-1 bg-surface-active" />
            </li>
          ))}
        </ul>
      )}

      <div role="alert" className="empty:hidden">
        {problems.length > 0 && (
          <ul className="grid gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
