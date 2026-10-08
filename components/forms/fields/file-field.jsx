"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
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
  const latest = useRef(files);
  const inputRef = useRef(null);
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
  };

  return (
    <div className="grid gap-2">
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
            <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => inputRef.current?.click()}>
              <Paperclip />
              {maxFiles > 1 ? tr("uploadFiles") : tr("uploadFile")}
            </Button>
            <span className="hidden sm:inline">{tr("dropFiles")}</span>
          </div>
          <p className="text-[11px] text-text-tertiary">
            {[accept && accept.replace(/,/g, ", "), `≤ ${maxSizeMb} MB`, maxFiles > 1 && tr("maxFiles", { count: maxFiles })].filter(Boolean).join(" · ")}
          </p>
          {preview && <p className="text-[11px] text-text-tertiary">{tr("previewOnly")}</p>}
          <input
            ref={inputRef}
            id={ids.control}
            type="file"
            className="sr-only"
            multiple={maxFiles > 1}
            accept={accept || undefined}
            disabled={locked}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            {...aria}
          />
        </div>
      )}

      {(files.length > 0 || pending.length > 0) && (
        <ul className="grid gap-1.5">
          {files.map((f, i) => (
            <li key={`${f.path || f.name}-${i}`} className="flex items-center gap-2.5 rounded-md border border-border bg-surface-card px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
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
                <span className="min-w-0 flex-1 truncate text-foreground">{job.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-text-tertiary">{Math.round(job.progress * 100)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-active" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress * 100)} aria-label={tr("uploading")}>
                <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(4, job.progress * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {problems.length > 0 && (
        <ul className="grid gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300" role="status">
          {problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
