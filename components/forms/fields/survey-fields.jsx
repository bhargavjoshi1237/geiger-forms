"use client";

import { useRef, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { RadioGroup, RadioGroupItem } from "@geiger/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { cn } from "@/lib/utils";
import { fieldIds } from "./field-shell";

function range(min, max) {
  const out = [];
  for (let i = min; i <= max; i += 1) out.push(i);
  return out;
}

// Roving-tabindex radiogroup of buttons (arrow keys move + select, Home/End jump).
function useRoving(values, value, onSelect) {
  const refs = useRef([]);
  const selectedIndex = values.indexOf(value);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const onKeyDown = (e, i) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = null;
    if (e.key in keys) next = (i + keys[e.key] + values.length) % values.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = values.length - 1;
    if (next == null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(values[next]);
  };
  return { refs, focusIndex, onKeyDown };
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
                active ? "fill-amber-400 text-amber-400" : "fill-transparent text-border-strong",
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
  return (
    <div>
      <div
        role="radiogroup"
        aria-labelledby={ids.label}
        className={cn("grid gap-1.5", compact ? "grid-cols-6 sm:grid-cols-11" : "")}
        style={compact ? undefined : { gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
        {...aria}
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
        <div className="mt-2 flex justify-between gap-4 text-xs text-text-tertiary">
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

// Matrix / Likert: rows × option columns. Table on wide screens, stacked radio groups on mobile.
export function MatrixField({ field, value, onChange, disabled, aria }) {
  const rows = field.config?.rows || [];
  const columns = field.options || [];
  const current = value && typeof value === "object" ? value : {};
  const locked = disabled || field.readOnly;
  const ids = fieldIds(field);
  const set = (row, col) => onChange({ ...current, [row]: col });

  if (rows.length === 0 || columns.length === 0) return null;
  return (
    <div {...aria}>
      <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
        <Table className="border-collapse" aria-labelledby={ids.label}>
          <TableHeader className="bg-transparent">
            <TableRow className="bg-surface-card hover:bg-surface-card">
              <TableHead scope="col" className="sr-only">
                Row
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
              // Each table row is one radio group; asChild keeps valid <tr> markup.
              <RadioGroup key={row} asChild value={current[row] ?? ""} onValueChange={(col) => set(row, col)} disabled={locked} aria-label={row} className="table-row gap-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="row" className="h-auto px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground">
                    {row}
                  </TableHead>
                  {columns.map((col, ci) => (
                    <TableCell key={col} className="px-2 py-2.5 text-center">
                      <RadioGroupItem id={`${ids.control}-${ri}-${ci}`} value={col} aria-label={`${row}: ${col}`} className="mx-auto" />
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
            <legend className="px-1 text-sm font-medium text-foreground">{row}</legend>
            <RadioGroup value={current[row] ?? ""} onValueChange={(col) => set(row, col)} disabled={locked} className="mt-1 grid gap-1.5">
              {columns.map((col, ci) => {
                const id = `${ids.control}-m-${ri}-${ci}`;
                return (
                  <label key={col} htmlFor={id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm text-text-secondary hover:bg-surface-hover">
                    <RadioGroupItem id={id} value={col} />
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
