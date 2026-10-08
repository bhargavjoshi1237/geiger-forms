"use client";

import { createElement, useState } from "react";
import { ArrowDown, ArrowUp, ClipboardPaste, Plus, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Switch } from "@geiger/ui/switch";
import { Textarea } from "@geiger/ui/textarea";
import { cn } from "@/lib/utils";
import { getFieldIcon } from "@/lib/forms/field-types";

// Small building blocks shared by the field settings panels and the sidebar sections.

// Lucide icon for a field type (keeps the lookup out of render-time component creation).
export function FieldTypeIcon({ type, className }) {
  return createElement(getFieldIcon(type), { className, "aria-hidden": true });
}

export function ControlLabel({ children, hint, className }) {
  return (
    <span className={cn("block", className)}>
      <span className="text-xs font-medium text-foreground">{children}</span>
      {hint ? <span className="mt-0.5 block text-[11px] leading-4 text-text-tertiary">{hint}</span> : null}
    </span>
  );
}

export function FieldRow({ label, hint, children, className }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <ControlLabel hint={hint}>{label}</ControlLabel>
      {children}
    </label>
  );
}

export function ToggleRow({ label, hint, checked, onCheckedChange, disabled, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-1.5", className)}>
      <ControlLabel hint={hint}>{label}</ControlLabel>
      <Switch checked={Boolean(checked)} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={typeof label === "string" ? label : undefined} className="mt-0.5 shrink-0" />
    </div>
  );
}

// Numeric input that stores numbers, and `undefined` when cleared.
export function NumberInput({ value, onChange, className, ...props }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      className={cn("h-8 bg-background text-sm", className)}
      {...props}
    />
  );
}

export function TextInput({ value, onChange, className, ...props }) {
  return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={cn("h-8 bg-background text-sm", className)} {...props} />;
}

export function SubtleNote({ children, className }) {
  return <p className={cn("text-[11px] leading-4 text-text-tertiary", className)}>{children}</p>;
}

function move(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Editable string list with reorder, remove, add and bulk paste; `renderExtra` adds per-row controls.
export function StringListEditor({ items, onChange, onRename, placeholder = "Option", addLabel = "Add option", renderExtra, emptyText }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const list = items || [];

  const update = (i, value) => {
    if (onRename) onRename(i, value);
    else onChange(list.map((o, idx) => (idx === i ? value : o)));
  };

  const openBulk = () => {
    setBulkText(list.join("\n"));
    setBulkOpen(true);
  };
  const applyBulk = () => {
    const parsed = bulkText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    onChange([...new Set(parsed)]);
    setBulkOpen(false);
  };

  if (bulkOpen) {
    return (
      <div className="space-y-2">
        <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} autoFocus className="min-h-28 resize-y bg-background text-sm" placeholder="One per line" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setBulkOpen(false)}>Cancel</Button>
          <Button type="button" size="sm" onClick={applyBulk}>Apply</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {list.length === 0 && emptyText ? <SubtleNote>{emptyText}</SubtleNote> : null}
      {list.map((item, i) => (
        <div key={i} className="group/row flex items-center gap-1.5">
          <Input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`${placeholder} ${i + 1}`}
            className="h-8 min-w-0 flex-1 bg-background text-sm"
            aria-label={`${placeholder} ${i + 1}`}
          />
          {renderExtra ? renderExtra(item, i) : null}
          <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover/row:opacity-100">
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Move up" disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))}>
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Move down" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))}>
              <ArrowDown />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove" className="hover:text-red-400" onClick={() => onChange(list.filter((_, idx) => idx !== i))}>
              <X />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-0.5">
        <Button type="button" variant="ghost" size="xs" onClick={() => onChange([...list, `${placeholder} ${list.length + 1}`])} className="h-auto gap-1 px-0 font-normal hover:bg-transparent has-[>svg]:px-0 text-text-secondary hover:text-foreground">
          <Plus className="h-3 w-3" />{addLabel}
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={openBulk} className="h-auto gap-1 px-0 font-normal hover:bg-transparent has-[>svg]:px-0 text-text-secondary hover:text-foreground">
          <ClipboardPaste className="h-3 w-3" />Bulk edit
        </Button>
      </div>
    </div>
  );
}
