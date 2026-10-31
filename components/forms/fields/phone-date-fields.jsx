"use client";

import { useState } from "react";
import { Input } from "@geiger/ui/input";
import { Label } from "@geiger/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { DIAL_CODES, joinPhone, splitPhone } from "@/lib/forms/phone";
import { cn } from "@/lib/utils";
import { fieldIds } from "./field-shell";

// Phone number with a country picker; the answer stays one string, starting with the dial code.
export function PhoneCountryInput({ field, value, onChange, disabled, aria, tr, large, autoFocus }) {
  const ids = fieldIds(field);
  const fallback = field.config?.defaultCountry || "US";
  const [picked, setPicked] = useState("");
  const { country, national } = splitPhone(value, fallback, picked);
  const locked = disabled || field.readOnly;
  const dial = DIAL_CODES.find((c) => c.code === country)?.dial || "";
  return (
    <div className="flex gap-2">
      <Select
        value={country}
        disabled={locked}
        onValueChange={(next) => {
          setPicked(next);
          onChange(joinPhone(next, national));
        }}
      >
        <SelectTrigger aria-label={tr("countryCode")} className={cn("w-28 shrink-0 bg-surface-card", large && "h-11")}>
          {/* The list shows full names; the narrow trigger shows the short form so long names aren't cut off. */}
          <SelectValue>
            {country} {dial}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DIAL_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.name} {c.dial}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={ids.control}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        placeholder={field.placeholder || ""}
        value={national}
        readOnly={field.readOnly || undefined}
        disabled={disabled}
        onChange={(e) => onChange(joinPhone(country, e.target.value))}
        className={cn("min-w-0 flex-1 bg-surface-card", large && "h-11")}
        {...aria}
      />
    </div>
  );
}

// Start and end dates; the end can't be set before the start.
export function DateRangeField({ field, value, onChange, disabled, aria, tr, large, autoFocus }) {
  const ids = fieldIds(field);
  const current = value && typeof value === "object" ? value : {};
  const set = (key) => (e) => {
    const next = { ...current, [key]: e.target.value };
    onChange(next.start || next.end ? next : undefined);
  };
  const part = (key, label, extra) => {
    const id = `${ids.control}-${key}`;
    return (
      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={id} className="text-xs font-normal text-text-secondary">
          {label}
        </Label>
        <Input id={id} type="date" value={current[key] ?? ""} readOnly={field.readOnly || undefined} disabled={disabled} onChange={set(key)} className={cn("bg-surface-card", large && "h-11")} {...aria} {...extra} />
      </div>
    );
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {part("start", tr("dateStart"), { autoFocus, max: current.end || undefined })}
      {part("end", tr("dateEnd"), { min: current.start || undefined })}
    </div>
  );
}
