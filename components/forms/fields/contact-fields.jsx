"use client";

import { Input } from "@geiger/ui/input";
import { Label } from "@geiger/ui/label";
import { cn } from "@/lib/utils";
import { fieldIds } from "./field-shell";
import { controlSize } from "./basic-inputs";

function Part({ id, label, value, onChange, disabled, readOnly, autoComplete, aria, large, className, autoFocus }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-normal text-text-secondary">
        {label}
      </Label>
      <Input
        id={id}
        value={value ?? ""}
        autoComplete={autoComplete}
        disabled={disabled}
        readOnly={readOnly || undefined}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className={cn("bg-surface-card", controlSize(large))}
        {...aria}
      />
    </div>
  );
}

export function NameField({ field, value, onChange, disabled, aria, large, tr, autoFocus }) {
  const ids = fieldIds(field);
  const current = value && typeof value === "object" ? value : {};
  const set = (key) => (v) => onChange({ ...current, [key]: v });
  return (
    <div role="group" aria-labelledby={ids.label} className="grid gap-3 sm:grid-cols-2">
      <Part id={ids.control} label={tr("firstName")} value={current.first} onChange={set("first")} autoComplete="given-name" disabled={disabled} readOnly={field.readOnly} aria={aria} large={large} autoFocus={autoFocus} />
      <Part id={`${ids.control}-last`} label={tr("lastName")} value={current.last} onChange={set("last")} autoComplete="family-name" disabled={disabled} readOnly={field.readOnly} aria={aria} large={large} />
    </div>
  );
}

export function AddressField({ field, value, onChange, disabled, aria, large, tr, autoFocus }) {
  const ids = fieldIds(field);
  const current = value && typeof value === "object" ? value : {};
  const set = (key) => (v) => onChange({ ...current, [key]: v });
  const common = { disabled, readOnly: field.readOnly, aria, large };
  return (
    <div role="group" aria-labelledby={ids.label} className="grid gap-3 sm:grid-cols-6">
      <Part id={ids.control} label={tr("address1")} value={current.line1} onChange={set("line1")} autoComplete="address-line1" className="sm:col-span-6" autoFocus={autoFocus} {...common} />
      <Part id={`${ids.control}-line2`} label={tr("address2")} value={current.line2} onChange={set("line2")} autoComplete="address-line2" className="sm:col-span-6" {...common} />
      <Part id={`${ids.control}-city`} label={tr("city")} value={current.city} onChange={set("city")} autoComplete="address-level2" className="sm:col-span-3" {...common} />
      <Part id={`${ids.control}-state`} label={tr("state")} value={current.state} onChange={set("state")} autoComplete="address-level1" className="sm:col-span-3" {...common} />
      <Part id={`${ids.control}-zip`} label={tr("zip")} value={current.zip} onChange={set("zip")} autoComplete="postal-code" className="sm:col-span-2" {...common} />
      <Part id={`${ids.control}-country`} label={tr("country")} value={current.country} onChange={set("country")} autoComplete="country-name" className="sm:col-span-4" {...common} />
    </div>
  );
}
