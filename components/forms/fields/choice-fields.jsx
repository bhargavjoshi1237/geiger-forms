"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, GripVertical } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@geiger/ui/radio-group";
import { Checkbox } from "@geiger/ui/checkbox";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { safeHttpUrl } from "@/lib/forms/logic";
import { choiceCardClass, fieldIds } from "./field-shell";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Letter shortcut (A, B, C…) shown on options in the conversational view.
export function KeyBadge({ index, selected }) {
  if (index >= LETTERS.length) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong text-text-secondary",
      )}
    >
      {LETTERS[index]}
    </span>
  );
}

// Conversational auto-advance on a pointer pick or Enter; Radix clicks the radio as arrow keys move focus, and those moves only select.
export function advanceProps(onAdvance) {
  if (!onAdvance) return {};
  return { onClick: (e) => e.detail > 0 && onAdvance(), onKeyDown: (e) => e.key === "Enter" && onAdvance() };
}

// Single choice as radio cards (arrow keys move between options via Radix).
export function SingleChoice({ field, value, onChange, disabled, aria, large, onAdvance }) {
  const options = field.options || [];
  const ids = fieldIds(field);
  const columns = options.length > 4 && !large ? "sm:grid-cols-2" : "";
  const advance = advanceProps(onAdvance);
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={onChange}
      disabled={disabled || field.readOnly}
      className={cn("grid gap-2", columns)}
      aria-labelledby={ids.label}
      {...aria}
    >
      {options.map((opt, i) => {
        const optId = `${ids.control}-opt-${i}`;
        const selected = value === opt;
        return (
          <label
            key={opt}
            htmlFor={optId}
            {...advance}
            className={choiceCardClass(selected, { disabled: disabled || field.readOnly, large })}
          >
            {large ? <KeyBadge index={i} selected={selected} /> : null}
            <RadioGroupItem id={optId} value={opt} className={cn("border-border-strong", large && "sr-only")} />
            <span className="min-w-0 flex-1 break-words">{opt}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

// Multiple choice as checkbox cards; unchecked options lock once maxSelect is reached.
export function MultiChoice({ field, value, onChange, disabled, aria, large }) {
  const options = field.options || [];
  const ids = fieldIds(field);
  const selected = Array.isArray(value) ? value : [];
  const max = Number(field.validation?.maxSelect) || 0;
  const atMax = max > 0 && selected.length >= max;
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt];
    onChange(next.length ? options.filter((o) => next.includes(o)) : []);
  };
  return (
    <div className={cn("grid gap-2", options.length > 4 && !large && "sm:grid-cols-2")}>
      {options.map((opt, i) => {
        const optId = `${ids.control}-opt-${i}`;
        const checked = selected.includes(opt);
        const locked = disabled || field.readOnly || (atMax && !checked);
        return (
          <label key={opt} htmlFor={optId} className={choiceCardClass(checked, { disabled: locked, large })}>
            {large ? <KeyBadge index={i} selected={checked} /> : null}
            <Checkbox id={optId} checked={checked} disabled={locked} onCheckedChange={() => toggle(opt)} aria-invalid={aria?.["aria-invalid"]} className={cn(large && "sr-only")} />
            <span className="min-w-0 flex-1 break-words">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

// Consent / yes-no checkbox: the field label is the statement being agreed to.
export function ConsentCheckbox({ field, label, value, onChange, disabled, aria, large }) {
  const ids = fieldIds(field);
  const checked = Boolean(value);
  return (
    <label htmlFor={ids.control} className={cn(choiceCardClass(checked, { disabled: disabled || field.readOnly, large }), "items-start")}>
      <Checkbox
        id={ids.control}
        checked={checked}
        disabled={disabled || field.readOnly}
        onCheckedChange={(c) => onChange(c === true)}
        className="mt-0.5"
        {...aria}
      />
      <span className="min-w-0 flex-1 whitespace-pre-line leading-relaxed text-foreground">
        {label}
        {field.required && (
          <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden="true">
            *
          </span>
        )}
      </span>
    </label>
  );
}

// Consent: the statement as a checkbox card, then a link to the policy it refers to (outside the label, so it never toggles it).
export function ConsentField({ field, tr, ...props }) {
  const policyUrl = safeHttpUrl(field.config?.policyUrl);
  return (
    <div className="grid gap-2">
      <ConsentCheckbox field={field} {...props} />
      {policyUrl && (
        <a
          href={policyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center gap-1.5 justify-self-start rounded-sm text-xs font-medium text-text-secondary underline underline-offset-4 hover:text-foreground"
        >
          {field.config?.policyLabel || tr("policyOpen")}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

// Ranking: drag to reorder (pointer) or use the arrow buttons / Alt+Arrow keys (keyboard).
export function RankingField({ field, value, onChange, disabled, tr }) {
  const options = field.options || [];
  const current = Array.isArray(value) && value.length ? [...value.filter((v) => options.includes(v)), ...options.filter((o) => !value.includes(o))] : options;
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [moved, setMoved] = useState("");
  const listRef = useRef(null);
  const pendingFocus = useRef(null);
  const locked = disabled || field.readOnly;

  const move = (from, to, dir) => {
    if (to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setMoved(tr("rankMoved", { item, position: to + 1, total: next.length }));
    if (dir) pendingFocus.current = { item, dir };
  };

  // Reordering can drop focus and the arrow may just have disabled itself, so keep focus on the moved item.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const row = listRef.current?.children[current.indexOf(pending.item)];
    (row?.querySelector(`[data-rank-dir="${pending.dir}"]:not(:disabled)`) || row?.querySelector("button:not(:disabled)"))?.focus();
  });

  return (
    <div>
      <ol ref={listRef} role="list" className="grid gap-2">
        {current.map((opt, i) => (
          <li
            key={opt}
            draggable={!locked}
            onKeyDown={(e) => {
              if (locked || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
              e.preventDefault();
              if (e.key === "ArrowUp") move(i, i - 1, "up");
              else move(i, i + 1, "down");
            }}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex != null) move(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg border bg-surface-card px-2.5 py-2 text-sm text-foreground transition-colors",
              overIndex === i && dragIndex !== i ? "border-primary" : "border-border",
              dragIndex === i && "opacity-50",
              locked && "opacity-60",
            )}
          >
            <GripVertical className={cn("size-4 shrink-0 text-text-tertiary", !locked && "cursor-grab")} aria-hidden="true" />
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-active text-xs font-semibold tabular-nums text-text-secondary">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 break-words">{opt}</span>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={locked || i === 0}
                aria-label={`${tr("moveUp")}: ${opt}`}
                data-rank-dir="up"
                onClick={() => move(i, i - 1, "up")}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={locked || i === current.length - 1}
                aria-label={`${tr("moveDown")}: ${opt}`}
                data-rank-dir="down"
                onClick={() => move(i, i + 1, "down")}
              >
                <ArrowDown />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <p role="status" className="sr-only">
        {moved}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-text-tertiary">{tr("rankHint")}</p>
        {!locked && !(Array.isArray(value) && value.length) && options.length > 0 && (
          <Button type="button" size="xs" variant="outline" aria-label={`${tr("ok")}: ${tr("rankKeep")}`} onClick={() => onChange([...options])}>
            {tr("ok")}
          </Button>
        )}
      </div>
    </div>
  );
}
