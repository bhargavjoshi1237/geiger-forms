"use client";

import { useRef } from "react";
import { Info, Lock } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { cn } from "@/lib/utils";
import { nextRovingIndex } from "@/lib/forms/a11y";

// Stable DOM ids for a field's control, hint and error (aria wiring).
export function fieldIds(field) {
  const base = `gf-${String(field?.id || "field").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return { control: base, hint: `${base}-hint`, error: `${base}-error`, label: `${base}-label`, note: `${base}-note` };
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

// Roving-tabindex radiogroup of buttons (arrow keys move + select, Home/End jump, left/right swap in RTL).
export function useRoving(values, value, onSelect) {
  const refs = useRef([]);
  const selectedIndex = values.indexOf(value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const onKeyDown = (e, i) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const next = nextRovingIndex(e.key, i, values.length, rtl);
    if (next == null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(values[next]);
  };
  return { refs, focusIndex, onKeyDown };
}

// Selectable card styling shared by choice, rating and NPS controls.
export function choiceCardClass(selected, { disabled, large } = {}) {
  return cn(
    "group relative flex w-full cursor-pointer items-center gap-3 rounded-lg border text-left text-sm transition-[border-color,background-color,box-shadow] duration-150 outline-none",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          data-gf-skip=""
          className="rounded-full text-text-tertiary hover:bg-transparent hover:text-foreground focus-visible:text-foreground"
        >
          <Info className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" aria-label={label} className="w-auto max-w-xs text-left text-xs leading-relaxed">
        {text}
      </PopoverContent>
    </Popover>
  );
}

// Announced through the runner's error summary or live region, so several at once don't pile up as alerts.
export function FieldError({ field, error, lang }) {
  if (!error) return null;
  return (
    <p id={fieldIds(field).error} lang={lang} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      {error}
    </p>
  );
}

// Label + required marker + info popover + hint + error around a control; `group` renders a fieldset labelled by its heading, unless `radio` says the control is its own radiogroup.
export function FieldShell({
  field,
  label,
  hint,
  error,
  group = false,
  radio = false,
  note,
  errorLang,
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
  const fieldset = group && !radio;
  const Wrapper = fieldset ? "fieldset" : "div";
  const LabelTag = group ? "span" : "label";
  const describedBy = fieldset ? [hint && ids.hint, note && ids.note, error && ids.error].filter(Boolean).join(" ") || undefined : undefined;
  return (
    <Wrapper data-gf-field={field?.id} className={cn("min-w-0", className)} aria-labelledby={fieldset ? ids.label : undefined} aria-describedby={describedBy}>
      {!hideLabel && (
        <div className={cn("flex items-start justify-between gap-3", large ? "mb-3" : "mb-2")}>
          <LabelTag
            id={ids.label}
            htmlFor={group ? undefined : ids.control}
            data-gf-part="label"
            data-gf-large={large ? "" : undefined}
            data-gf-group={group ? "" : undefined}
            className={cn(
              "block font-medium text-foreground",
              large ? "text-xl leading-snug sm:text-2xl" : "text-sm leading-snug",
            )}
          >
            {label}
            {field?.required && (
              <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden="true">
                *
              </span>
            )}
            {field?.required && <span className="sr-only"> ({requiredLabel})</span>}
          </LabelTag>
          <div className="flex shrink-0 items-center gap-1.5">
            {readOnly && (
              <Badge variant="neutral">
                <Lock />
                {readOnlyLabel}
              </Badge>
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
      {note && (
        <p id={ids.note} className="mt-2 text-xs text-text-tertiary">
          {note}
        </p>
      )}
      <FieldError field={field} error={error} lang={errorLang} />
    </Wrapper>
  );
}
