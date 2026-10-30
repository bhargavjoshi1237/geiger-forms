"use client";

import { useState } from "react";
import { Angry, Annoyed, Frown, Laugh, Meh, Smile, SmilePlus, Star } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { RadioGroup, RadioGroupItem } from "@geiger/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { cn } from "@/lib/utils";
import { opinionLabel, opinionSteps } from "@/lib/forms/field-types";
import { fieldIds, useRoving } from "./field-shell";

function range(min, max) {
  const out = [];
  for (let i = min; i <= max; i += 1) out.push(i);
  return out;
}

// Adds the id of a scale's end labels to a radiogroup's description.
function withEnds(aria, id) {
  return [aria?.["aria-describedby"], id].filter(Boolean).join(" ") || undefined;
}

// Star rating 1..config.max.
export function RatingField({ field, value, onChange, disabled, aria, large }) {
  const max = Math.min(10, Math.max(3, Number(field.config?.max) || 5));
  const values = range(1, max);
  const [hover, setHover] = useState(0);
  const locked = disabled || field.readOnly;
  const current = Number(value) || 0;
  const { refs, focusIndex, onKeyDown } = useRoving(values, current, (v) => !locked && onChange(v));
  const ids = fieldIds(field);
  return (
    <div role="radiogroup" aria-labelledby={ids.label} className="flex flex-wrap items-center gap-1" onMouseLeave={() => setHover(0)} {...aria}>
      {values.map((n, i) => {
        const active = (hover || current) >= n;
        return (
          <Button
            key={n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            variant="ghost"
            size="icon-lg"
            role="radio"
            aria-checked={current === n}
            aria-label={`${n} / ${max}`}
            tabIndex={i === focusIndex ? 0 : -1}
            disabled={locked}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(current === n && !field.required ? undefined : n)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn("hover:bg-transparent disabled:opacity-60", large && "size-12")}
          >
            <Star
              className={cn(
                "transition-[color,fill,transform] duration-150",
                large ? "size-9" : "size-7",
                active ? "fill-amber-400 text-amber-600 dark:text-amber-400" : "fill-transparent text-border-strong",
                !locked && hover === n && "scale-110",
              )}
            />
          </Button>
        );
      })}
      {current > 0 && <span className="ml-2 text-sm tabular-nums text-text-secondary">{current} / {max}</span>}
    </div>
  );
}

// Button row for scale / NPS values; `tone(n)` adds an optional subtle colour per value.
function NumberRow({ field, values, value, onChange, disabled, aria, large, tone, minLabel, maxLabel }) {
  const locked = disabled || field.readOnly;
  const current = value === undefined || value === null || value === "" ? null : Number(value);
  const { refs, focusIndex, onKeyDown } = useRoving(values, current, (v) => !locked && onChange(v));
  const ids = fieldIds(field);
  const compact = values.length > 7;
  const endsId = minLabel || maxLabel ? `${ids.control}-ends` : undefined;
  return (
    <div>
      <div
        role="radiogroup"
        aria-labelledby={ids.label}
        className={cn("grid gap-1.5", compact ? "grid-cols-6 sm:grid-cols-11" : "")}
        style={compact ? undefined : { gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
        {...aria}
        aria-describedby={withEnds(aria, endsId)}
      >
        {values.map((n, i) => {
          const selected = current === n;
          return (
            <Button
              key={n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              variant={selected ? "default" : "outline"}
              role="radio"
              aria-checked={selected}
              tabIndex={i === focusIndex ? 0 : -1}
              disabled={locked}
              onClick={() => onChange(n)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "w-full min-w-0 border px-0 tabular-nums shadow-none disabled:opacity-60",
                large ? "h-12 text-base" : "h-10",
                selected
                  ? "border-primary"
                  : cn("border-border bg-surface-card text-text-secondary hover:border-border-strong hover:bg-surface-hover hover:text-foreground", tone?.(n)),
              )}
            >
              {n}
            </Button>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div id={endsId} className="mt-2 flex justify-between gap-4 text-xs text-text-tertiary">
          <span>{minLabel}</span>
          <span className="text-right">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

export function ScaleField({ field, ...props }) {
  const cfg = field.config || {};
  const min = Number.isFinite(Number(cfg.min)) && cfg.min !== "" ? Number(cfg.min) : 1;
  const maxRaw = Number.isFinite(Number(cfg.max)) && cfg.max !== "" ? Number(cfg.max) : 10;
  const max = Math.max(min + 1, Math.min(min + 20, maxRaw));
  return <NumberRow field={field} values={range(min, max)} minLabel={cfg.minLabel} maxLabel={cfg.maxLabel} {...props} />;
}

const npsTone = (n) =>
  n <= 6 ? "hover:border-red-500/40 hover:bg-red-500/10" : n <= 8 ? "hover:border-amber-500/40 hover:bg-amber-500/10" : "hover:border-emerald-500/40 hover:bg-emerald-500/10";

export function NpsField({ field, tr, ...props }) {
  return (
    <NumberRow
      field={field}
      values={range(0, 10)}
      tone={npsTone}
      minLabel={field.config?.minLabel || tr("notLikely")}
      maxLabel={field.config?.maxLabel || tr("veryLikely")}
      {...props}
    />
  );
}

const FACES = {
  3: [Frown, Meh, Smile],
  4: [Frown, Annoyed, Smile, Laugh],
  5: [Angry, Frown, Meh, Smile, Laugh],
  6: [Angry, Frown, Annoyed, Smile, SmilePlus, Laugh],
  7: [Angry, Frown, Annoyed, Meh, Smile, SmilePlus, Laugh],
};
const FACE_COLUMNS = { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6", 7: "grid-cols-7" };
const LABEL_COLUMNS = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6", 7: "sm:grid-cols-7" };

// Opinion scale 1..steps as faces (default) or labelled steps (config.style "labels"); the step number is stored.
export function OpinionScale({ field, value, onChange, disabled, aria, large }) {
  const steps = opinionSteps(field);
  const values = range(1, steps);
  const faces = field.config?.style !== "labels";
  const locked = disabled || field.readOnly;
  const current = Number(value) || null;
  const { refs, focusIndex, onKeyDown } = useRoving(values, current, (v) => !locked && onChange(v));
  const ids = fieldIds(field);
  const first = opinionLabel(field, 1);
  const last = opinionLabel(field, steps);
  const endsId = faces && (first || last) ? `${ids.control}-ends` : undefined;
  return (
    <div>
      <div role="radiogroup" aria-labelledby={ids.label} className={cn("grid gap-1.5", faces ? FACE_COLUMNS[steps] : LABEL_COLUMNS[steps])} {...aria} aria-describedby={withEnds(aria, endsId)}>
        {values.map((n, i) => {
          const selected = current === n;
          const label = opinionLabel(field, n);
          const Face = FACES[steps][i];
          return (
            <Button
              key={n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              variant="outline"
              role="radio"
              aria-checked={selected}
              aria-label={label ? `${label} (${n} / ${steps})` : `${n} / ${steps}`}
              tabIndex={i === focusIndex ? 0 : -1}
              disabled={locked}
              onClick={() => onChange(selected && !field.required ? undefined : n)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "h-auto w-full min-w-0 whitespace-normal border shadow-none disabled:opacity-60",
                faces ? "px-0 py-2.5" : cn("px-2 text-center text-xs leading-snug", large ? "py-4 text-sm" : "py-3"),
                selected
                  ? "border-primary bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary/10"
                  : "border-border bg-surface-card text-text-secondary hover:border-border-strong hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {faces ? <Face className={cn("transition-transform duration-150", large ? "size-9" : "size-7", selected ? "scale-110 text-primary" : "")} aria-hidden="true" /> : label || n}
            </Button>
          );
        })}
      </div>
      {faces && (first || last) && (
        <div id={endsId} className="mt-2 flex justify-between gap-4 text-xs text-text-tertiary">
          <span>{first}</span>
          <span className="text-right">{last}</span>
        </div>
      )}
    </div>
  );
}

// Matrix / Likert: rows × option columns. Table on wide screens, stacked radio groups on mobile.
export function MatrixField({ field, value, onChange, disabled, aria, tr }) {
  const rows = field.config?.rows || [];
  const columns = field.options || [];
  const current = value && typeof value === "object" ? value : {};
  const locked = disabled || field.readOnly;
  const ids = fieldIds(field);
  const set = (row, col) => onChange({ ...current, [row]: col });
  // Only the rows still unanswered are invalid.
  const invalid = (row) => (aria?.["aria-invalid"] && !current[row] ? true : undefined);

  if (rows.length === 0 || columns.length === 0) return null;
  return (
    <div>
      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <Table className="border-collapse" aria-labelledby={ids.label}>
          <TableHeader className="bg-transparent">
            <TableRow className="bg-surface-card hover:bg-surface-card">
              <TableHead scope="col" className="sr-only">
                {tr("matrixRow")}
              </TableHead>
              {columns.map((col) => (
                <TableHead key={col} scope="col" className="h-auto px-2 py-2.5 text-center font-medium normal-case tracking-normal">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, ri) => (
              // Each row groups its radios for arrow keys; role="row" stops Radix's radiogroup role replacing the table row, and each radio names its row and column.
              <RadioGroup key={row} asChild role="row" value={current[row] ?? ""} onValueChange={(col) => set(row, col)} disabled={locked} className="table-row gap-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="row" className="h-auto px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground">
                    {row}
                  </TableHead>
                  {columns.map((col, ci) => (
                    <TableCell key={col} className="px-2 py-2.5 text-center">
                      <RadioGroupItem id={`${ids.control}-${ri}-${ci}`} value={col} aria-label={`${row}: ${col}`} aria-invalid={invalid(row)} className="relative mx-auto border-border-strong after:absolute after:-inset-1.5" />
                    </TableCell>
                  ))}
                </TableRow>
              </RadioGroup>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 sm:hidden">
        {rows.map((row, ri) => (
          <fieldset key={row} className="rounded-lg border border-border bg-surface-card p-3">
            <legend id={`${ids.control}-m-${ri}`} className="px-1 text-sm font-medium text-foreground">
              {row}
            </legend>
            <RadioGroup value={current[row] ?? ""} onValueChange={(col) => set(row, col)} disabled={locked} aria-labelledby={`${ids.control}-m-${ri}`} aria-invalid={invalid(row)} className="mt-1 grid gap-1.5">
              {columns.map((col, ci) => {
                const id = `${ids.control}-m-${ri}-${ci}`;
                return (
                  <label key={col} htmlFor={id} className="flex min-h-6 cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm text-text-secondary hover:bg-surface-hover">
                    <RadioGroupItem id={id} value={col} className="border-border-strong" />
                    {col}
                  </label>
                );
              })}
            </RadioGroup>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
