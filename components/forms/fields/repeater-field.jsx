"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Label } from "@geiger/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { DropdownInput, LongTextInput, TextLikeInput } from "./basic-inputs";
import { fieldIds } from "./field-shell";

function SubInput({ sub, id, value, onChange, disabled, tr, labelled = false }) {
  const field = { ...sub, id, title: sub.label, validation: sub.validation, readOnly: false };
  // A table cell has only its column header above it, so it names itself.
  const common = { field, id, value, onChange, disabled, aria: { "aria-required": sub.required || undefined, ...(labelled ? { "aria-label": sub.label || "Field" } : {}) } };
  if (sub.type === "textarea") return <LongTextInput {...common} />;
  if (sub.type === "dropdown") return <DropdownInput {...common} placeholder={tr("selectPlaceholder")} />;
  // Rows usually describe other people, so the respondent's own autofill profile must not fill them.
  return <TextLikeInput {...common} autoComplete="off" />;
}

// Repeating group: rows of sub-fields with add/remove bounded by config.minRows / maxRows.
export function RepeaterField({ field, value, onChange, disabled, tr }) {
  const cfg = field.config || {};
  const subs = Array.isArray(cfg.subFields) ? cfg.subFields : [];
  const minRows = Math.max(0, Number(cfg.minRows) || 0);
  const maxRows = Math.max(1, Number(cfg.maxRows) || 10);
  const stored = Array.isArray(value) ? value : [];
  const rows = stored.length >= Math.max(1, minRows) ? stored : [...stored, ...Array.from({ length: Math.max(1, minRows) - stored.length }, () => ({}))];
  const ids = fieldIds(field);
  const locked = disabled || field.readOnly;
  const canRemove = rows.length > minRows && !(rows.length === 1 && stored.length === 0);

  const [status, setStatus] = useState("");
  const rootRef = useRef(null);
  const pendingFocus = useRef(null);

  const setCell = (ri, subId, v) => onChange(rows.map((row, i) => (i === ri ? { ...row, [subId]: v } : row)));
  const addRow = () => {
    onChange([...rows, {}]);
    setStatus(tr("entryAdded", { n: rows.length + 1 }));
    pendingFocus.current = rows.length;
  };
  const removeRow = (ri) => {
    const next = rows.filter((_, i) => i !== ri);
    onChange(next.length ? next : undefined);
    setStatus(tr("entryRemoved", { n: ri + 1 }));
    pendingFocus.current = Math.max(0, ri - 1);
  };

  // Adding moves focus into the new entry; removing, whose button just vanished, moves it to the entry before.
  useEffect(() => {
    if (pendingFocus.current == null) return;
    const entry = rootRef.current?.querySelector(`[data-gf-entry="${pendingFocus.current}"]`);
    pendingFocus.current = null;
    entry?.querySelector("input, textarea, [role='combobox']")?.focus();
  });

  return (
    <div ref={rootRef} className="grid gap-2.5">
      <p role="status" className="sr-only">
        {status}
      </p>
      {cfg.layout === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="bg-surface-card hover:bg-surface-card">
                {subs.map((sub) => (
                  <TableHead key={sub.id} scope="col" className="h-auto min-w-36 px-2 py-2 text-xs font-normal normal-case tracking-normal text-text-secondary">
                    {sub.label || "Field"}
                    {sub.required && <span className="text-red-600 dark:text-red-400" aria-hidden="true">*</span>}
                  </TableHead>
                ))}
                <TableHead className="w-9 p-0"><span className="sr-only">{tr("removeRow")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, ri) => (
                <TableRow key={ri} data-gf-entry={ri} aria-label={tr("entry", { n: ri + 1 })} className="hover:bg-transparent">
                  {subs.map((sub) => (
                    <TableCell key={sub.id} className="p-1.5 align-top">
                      <SubInput labelled sub={sub} id={`${ids.control}-${ri}-${sub.id}`} value={row?.[sub.id]} onChange={(v) => setCell(ri, sub.id, v)} disabled={locked} tr={tr} />
                    </TableCell>
                  ))}
                  <TableCell className="p-1 align-middle">
                    {canRemove ? (
                      <Button type="button" size="icon-xs" variant="ghost" disabled={locked} aria-label={`${tr("removeRow")} ${tr("entry", { n: ri + 1 })}`} onClick={() => removeRow(ri)}>
                        <Trash2 />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : rows.map((row, ri) => (
        <div key={ri} role="group" aria-label={tr("entry", { n: ri + 1 })} data-gf-entry={ri} className="rounded-lg border border-border bg-surface-card p-3">
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
                    {sub.required && <span className="text-red-600 dark:text-red-400" aria-hidden="true">*</span>}
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
