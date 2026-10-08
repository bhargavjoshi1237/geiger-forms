"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Label } from "@geiger/ui/label";
import { DropdownInput, LongTextInput, TextLikeInput } from "./basic-inputs";
import { fieldIds } from "./field-shell";

function SubInput({ sub, id, value, onChange, disabled, tr }) {
  const field = { ...sub, id, title: sub.label, validation: sub.validation, readOnly: false };
  const common = { field, id, value, onChange, disabled, aria: { "aria-required": sub.required || undefined } };
  if (sub.type === "textarea") return <LongTextInput {...common} />;
  if (sub.type === "dropdown") return <DropdownInput {...common} placeholder={tr("selectPlaceholder")} />;
  return <TextLikeInput {...common} />;
}

// Repeating group: rows of sub-fields with add/remove bounded by config.minRows / maxRows.
export function RepeaterField({ field, value, onChange, disabled, aria, tr }) {
  const cfg = field.config || {};
  const subs = Array.isArray(cfg.subFields) ? cfg.subFields : [];
  const minRows = Math.max(0, Number(cfg.minRows) || 0);
  const maxRows = Math.max(1, Number(cfg.maxRows) || 10);
  const stored = Array.isArray(value) ? value : [];
  const rows = stored.length >= Math.max(1, minRows) ? stored : [...stored, ...Array.from({ length: Math.max(1, minRows) - stored.length }, () => ({}))];
  const ids = fieldIds(field);
  const locked = disabled || field.readOnly;
  const canRemove = rows.length > minRows && !(rows.length === 1 && stored.length === 0);

  const setCell = (ri, subId, v) => onChange(rows.map((row, i) => (i === ri ? { ...row, [subId]: v } : row)));
  const addRow = () => onChange([...rows, {}]);
  const removeRow = (ri) => {
    const next = rows.filter((_, i) => i !== ri);
    onChange(next.length ? next : undefined);
  };

  return (
    <div role="group" aria-labelledby={ids.label} className="grid gap-2.5" {...aria}>
      {rows.map((row, ri) => (
        <div key={ri} className="rounded-lg border border-border bg-surface-card p-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-text-secondary">{tr("entry", { n: ri + 1 })}</span>
            {canRemove ? (
              <Button type="button" size="icon-xs" variant="ghost" disabled={locked} aria-label={`${tr("removeRow")} ${tr("entry", { n: ri + 1 })}`} onClick={() => removeRow(ri)}>
                <Trash2 />
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {subs.map((sub) => {
              const id = `${ids.control}-${ri}-${sub.id}`;
              return (
                <div key={sub.id} className={sub.type === "textarea" ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}>
                  <Label htmlFor={id} className="text-xs font-normal text-text-secondary">
                    {sub.label || "Field"}
                    {sub.required && <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>}
                  </Label>
                  <SubInput sub={sub} id={id} value={row?.[sub.id]} onChange={(v) => setCell(ri, sub.id, v)} disabled={locked} tr={tr} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {rows.length < maxRows && (
        <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={locked} onClick={addRow}>
          <Plus />
          {cfg.addLabel || tr("addRow")}
        </Button>
      )}
    </div>
  );
}
