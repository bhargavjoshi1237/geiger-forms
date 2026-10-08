"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@geiger/ui/radio-group";
import { Checkbox } from "@geiger/ui/checkbox";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { choiceCardClass, fieldIds } from "./field-shell";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function KeyBadge({ index, selected }) {
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

// Single choice as radio cards (arrow keys move between options via Radix).
export function SingleChoice({ field, value, onChange, disabled, aria, large, onAdvance }) {
  const options = field.options || [];
  const ids = fieldIds(field);
  const columns = options.length > 4 && !large ? "sm:grid-cols-2" : "";
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
            onClick={onAdvance}
            className={choiceCardClass(selected, { disabled: disabled || field.readOnly, large })}
          >
            {large ? <KeyBadge index={i} selected={selected} /> : null}
            <RadioGroupItem id={optId} value={opt} className={cn(large && "sr-only")} />
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
    <div role="group" aria-labelledby={ids.label} className={cn("grid gap-2", options.length > 4 && !large && "sm:grid-cols-2")} {...aria}>
      {options.map((opt, i) => {
        const optId = `${ids.control}-opt-${i}`;
        const checked = selected.includes(opt);
        const locked = disabled || field.readOnly || (atMax && !checked);
        return (
          <label key={opt} htmlFor={optId} className={choiceCardClass(checked, { disabled: locked, large })}>
            {large ? <KeyBadge index={i} selected={checked} /> : null}
            <Checkbox id={optId} checked={checked} disabled={locked} onCheckedChange={() => toggle(opt)} className={cn(large && "sr-only")} />
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
      <span className="min-w-0 flex-1 leading-relaxed text-foreground">
        {label}
        {field.required && (
          <span className="ml-1 text-red-500 dark:text-red-400" aria-hidden="true">
            *
          </span>
        )}
      </span>
    </label>
  );
}

// Ranking: drag to reorder (pointer) or use the arrow buttons / Alt+Arrow keys (keyboard).
export function RankingField({ field, value, onChange, disabled, aria, tr }) {
  const options = field.options || [];
  const current = Array.isArray(value) && value.length ? [...value.filter((v) => options.includes(v)), ...options.filter((o) => !value.includes(o))] : options;
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const ids = fieldIds(field);
  const locked = disabled || field.readOnly;

  const move = (from, to) => {
    if (to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <ol role="list" aria-labelledby={ids.label} className="grid gap-2" {...aria}>
        {current.map((opt, i) => (
          <li
            key={opt}
            draggable={!locked}
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
                onClick={() => move(i, i - 1)}
                onKeyDown={(e) => {
                  if (e.altKey && e.key === "ArrowDown") move(i, i + 1);
                }}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={locked || i === current.length - 1}
                aria-label={`${tr("moveDown")}: ${opt}`}
                onClick={() => move(i, i + 1)}
                onKeyDown={(e) => {
                  if (e.altKey && e.key === "ArrowUp") move(i, i - 1);
                }}
              >
                <ArrowDown />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-text-tertiary">{tr("rankHint")}</p>
        {!locked && !(Array.isArray(value) && value.length) && options.length > 0 && (
          <Button type="button" size="xs" variant="outline" onClick={() => onChange([...options])}>
            {tr("ok")}
          </Button>
        )}
      </div>
    </div>
  );
}
