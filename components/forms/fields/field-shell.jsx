"use client";

import { Info, Lock } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@geiger/ui/tooltip";
import { cn } from "@/lib/utils";

// Stable DOM ids for a field's control, hint and error (aria wiring).
export function fieldIds(field) {
  const base = `gf-${String(field?.id || "field").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return { control: base, hint: `${base}-hint`, error: `${base}-error`, label: `${base}-label` };
}

// aria-describedby / aria-invalid props for a control.
export function ariaProps(field, { hint, error }) {
  const ids = fieldIds(field);
  const describedBy = [hint ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ");
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    "aria-required": field?.required ? true : undefined,
  };
}

// Selectable card styling shared by choice, rating and NPS controls.
export function choiceCardClass(selected, { disabled, large } = {}) {
  return cn(
    "group relative flex w-full cursor-pointer items-center gap-3 rounded-lg border text-left text-sm transition-[border-color,background-color,box-shadow] duration-150 outline-none",
    "focus-within:ring-[3px] focus-within:ring-ring/40 focus-visible:ring-[3px] focus-visible:ring-ring/40",
    large ? "px-4 py-3.5 text-base" : "px-3.5 py-2.5",
    selected
      ? "border-primary bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
      : "border-border bg-surface-card text-text-secondary hover:border-border-strong hover:bg-surface-hover hover:text-foreground",
    disabled && "pointer-events-none opacity-60",
  );
}

export function InfoTip({ text, label = "More info" }) {
  if (!text) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            className="size-5 rounded-full text-text-tertiary hover:bg-transparent hover:text-foreground focus-visible:text-foreground"
          >
            <Info className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FieldError({ field, error }) {
  if (!error) return null;
  return (
    <p id={fieldIds(field).error} role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400">
      {error}
    </p>
  );
}

// Label + required marker + info tooltip + hint + error around a control. `group` renders a fieldset labelled by its heading.
export function FieldShell({
  field,
  label,
  hint,
  error,
  group = false,
  large = false,
  readOnly = false,
  readOnlyLabel = "Read only",
  infoLabel,
  requiredLabel = "Required",
  hideLabel = false,
  className,
  children,
}) {
  const ids = fieldIds(field);
  const Wrapper = group ? "fieldset" : "div";
  const LabelTag = group ? "span" : "label";
  return (
    <Wrapper className={cn("min-w-0", className)} aria-labelledby={group ? ids.label : undefined}>
      {!hideLabel && (
        <div className={cn("flex items-start justify-between gap-3", large ? "mb-3" : "mb-2")}>
          <LabelTag
            id={ids.label}
            htmlFor={group ? undefined : ids.control}
            className={cn(
              "block font-medium text-foreground",
              large ? "text-xl leading-snug sm:text-2xl" : "text-sm leading-snug",
            )}
          >
            {label}
            {field?.required && (
              <span className="ml-1 text-red-500 dark:text-red-400" aria-hidden="true">
                *
              </span>
            )}
            {field?.required && <span className="sr-only"> ({requiredLabel})</span>}
          </LabelTag>
          <div className="flex shrink-0 items-center gap-1.5">
            {readOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-card px-2 py-0.5 text-[11px] text-text-secondary">
                <Lock className="size-3" />
                {readOnlyLabel}
              </span>
            )}
            <InfoTip text={field?.info} label={infoLabel} />
          </div>
        </div>
      )}
      {hint && (
        <p id={ids.hint} className={cn("-mt-1 text-muted-foreground", large ? "mb-4 text-base" : "mb-2.5 text-xs leading-relaxed")}>
          {hint}
        </p>
      )}
      {children}
      <FieldError field={field} error={error} />
    </Wrapper>
  );
}
