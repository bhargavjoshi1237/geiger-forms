"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, ExternalLink, Info, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@geiger/ui/tooltip";
import { cn } from "@/lib/utils";
import { withPrefix } from "@/lib/workspace/base-path";

// Small building blocks shared by the form editor sections.

export const OUTLINE_BTN =
  "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground";
export const FIELD_CLS = "border-border bg-surface-card text-foreground";

const noop = () => () => {};

// window.location.origin, SSR-safe.
export function useOrigin() {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}

export function publicFormUrl(origin, slug) {
  return `${origin}${withPrefix(`/form/${slug}`)}`;
}

export function randomHex(bytes = 16) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function uid(prefix = "id") {
  return `${prefix}-${randomHex(4)}`;
}

export async function sha256Hex(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function copyText(text, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch {
    toast.error("Couldn't copy — select the text and copy it manually.");
    return false;
  }
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

export function Stack({ children, className }) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

// Inline info / warning callout.
export function Note({ children, tone = "info", icon: Icon = Info, className }) {
  const toneCls =
    tone === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : tone === "success"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border-border bg-surface-card text-text-secondary";
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs leading-5", toneCls, className)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Read-only value with a copy button; `multiline` renders a code block.
export function CopyField({ value, multiline = false, label = "Copied to clipboard", className }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(value, label)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };
  const Icon = copied ? Check : Copy;
  if (multiline) {
    return (
      <div className={cn("relative", className)}>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-surface-card p-3 pr-12 font-mono text-[11px] leading-5 text-muted-foreground">
          {value}
        </pre>
        <Button type="button" size="icon" variant="ghost" aria-label="Copy" onClick={copy} className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:bg-surface-active hover:text-foreground">
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  return (
    <div className={cn("flex gap-2", className)}>
      <Input readOnly value={value} onFocus={(e) => e.target.select()} className={cn("h-9 flex-1 font-mono text-xs", FIELD_CLS)} />
      <Button type="button" variant="outline" onClick={copy} className={cn("h-9 shrink-0", OUTLINE_BTN)}>
        <Icon className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

// Email/text chips with Enter-to-add.
export function ChipsInput({ value = [], onChange, placeholder = "Add and press Enter…", validate = isEmail, invalidMessage = "Enter a valid email address." }) {
  const [input, setInput] = useState("");
  const add = () => {
    const parts = input.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const bad = parts.filter((p) => validate && !validate(p));
    if (bad.length) {
      toast.error(invalidMessage);
      return;
    }
    const next = [...value];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    onChange(next);
    setInput("");
  };
  return (
    <div className="space-y-2">
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span key={item} className="flex items-center gap-1 rounded-md border border-border bg-surface-card px-2 py-0.5 text-xs text-muted-foreground">
              {item}
              <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((x) => x !== item))} className="size-4 text-text-tertiary hover:bg-transparent hover:text-foreground">
                <X className="size-3" />
              </Button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={cn("h-9 flex-1", FIELD_CLS)}
        />
        <Button type="button" variant="outline" onClick={add} className={cn("h-9 shrink-0 px-3", OUTLINE_BTN)}>
          Add
        </Button>
      </div>
    </div>
  );
}

// Numeric input that keeps "" for "unset".
export function NumberInput({ value, onChange, placeholder, min, max, step, className }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className={cn("h-9", FIELD_CLS, className)}
    />
  );
}

export function TextInput({ value, onChange, className, ...props }) {
  return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={cn("h-9", FIELD_CLS, className)} {...props} />;
}

export function TextArea({ value, onChange, rows = 3, className, ...props }) {
  return <Textarea value={value ?? ""} rows={rows} onChange={(e) => onChange(e.target.value)} className={cn("resize-y text-sm", FIELD_CLS, className)} {...props} />;
}

// Bordered row container for list editors (webhooks, coupons, steps…).
export function ItemCard({ children, onRemove, removeLabel = "Remove", className }) {
  return (
    <div className={cn("relative rounded-lg border border-border bg-surface-card p-4", className)}>
      {onRemove ? (
        <Button type="button" size="icon" variant="ghost" aria-label={removeLabel} onClick={onRemove} className="absolute right-2 top-2 h-7 w-7 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {children}
    </div>
  );
}

export function AddButton({ children, onClick, disabled }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled} className={OUTLINE_BTN}>
      <Plus className="h-3.5 w-3.5" /> {children}
    </Button>
  );
}

// "Edit this in the builder" hand-off card used by the structure summaries.
export function BuilderLink({ onOpenBuilder, label = "Open builder", children }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-secondary">{children}</p>
      <Button type="button" variant="outline" onClick={onOpenBuilder} className={cn("shrink-0", OUTLINE_BTN)}>
        <ExternalLink className="h-4 w-4" /> {label}
      </Button>
    </div>
  );
}

// Label/value pair for read-only summaries.
export function Detail({ label, value, className }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

// Compact merge-tag reference for respondent-facing text.
export function MergeTagHelp({ fields = [], extras = ["score", "outcome", "total"] }) {
  const names = fields.filter((f) => !["page", "heading", "content"].includes(f.type)).slice(0, 8).map((f) => f.title);
  return (
    <p className="text-xs leading-5 text-text-tertiary">
      Merge tags: {names.map((n) => <code key={n} className="mx-0.5 rounded bg-surface-card px-1 text-text-secondary">{`{${n}}`}</code>)}
      {extras.map((n) => <code key={n} className="mx-0.5 rounded bg-surface-card px-1 text-text-secondary">{`{${n}}`}</code>)}
    </p>
  );
}

// Fields that collect input, for pickers (automations, duplicates…).
export function inputFields(fieldDefs = []) {
  return fieldDefs.filter((f) => f.included !== false && !["page", "heading", "content", "total"].includes(f.type));
}

// Wraps a disabled control with an explanatory tooltip (advisory RBAC gating).
export function DisabledHint({ when, hint, children }) {
  if (!when) return children;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
