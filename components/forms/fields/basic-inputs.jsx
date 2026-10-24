"use client";

import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { cn } from "@/lib/utils";
import { autofillToken } from "@/lib/forms/field-types";
import { fieldIds } from "./field-shell";

const INPUT_TYPES = {
  text: "text",
  email: "email",
  phone: "tel",
  url: "url",
  number: "number",
  currency: "number",
  date: "date",
  time: "time",
  datetime: "datetime-local",
};

const INPUT_MODE = { number: "decimal", currency: "decimal", phone: "tel", email: "email", url: "url" };
const VERBATIM = new Set(["email", "url"]);

// Currency symbol for a 3-letter code via Intl (falls back to the code).
export function currencySymbol(currency = "usd") {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency).toUpperCase() }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || String(currency).toUpperCase();
  } catch {
    return String(currency || "").toUpperCase();
  }
}

// Coerces a raw input string into the stored answer type.
function coerce(type, raw) {
  if (type === "number" || type === "currency") {
    if (raw === "" || raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

// Shared field geometry: the suite Input pads from the --input-box-* tokens, so select triggers and textareas
// read the same tokens to stay the same height; `large` (conversational view) only grows padding and text.
export const controlSize = (large) => (large ? "py-3 text-base md:text-lg" : "");
const BOX_PADDING = "px-[var(--input-box-padding-x,0.75rem)] py-[var(--input-box-padding-y,0.5rem)] leading-5";
export const selectBox = (large) => cn("w-full bg-surface-card data-[size=default]:h-auto", BOX_PADDING, large && "py-3 text-base md:text-lg");
const textareaBox = (large) => cn("min-h-28 resize-y", BOX_PADDING, large && "text-base md:text-lg");

// Single-line input for text-like, numeric and date/time types; `autoComplete` overrides the field's autofill token.
export function TextLikeInput({ field, value, onChange, disabled, aria, large, autoFocus, currency, id, onEnter, placeholder, autoComplete }) {
  const type = field.type;
  const v = field.validation || {};
  const symbol = type === "currency" ? currencySymbol(field.config?.currency || currency) : "";
  const inputType = INPUT_TYPES[type] || "text";
  const numeric = type === "number" || type === "currency";
  const input = (
    <Input
      id={id || fieldIds(field).control}
      type={inputType}
      inputMode={INPUT_MODE[type]}
      autoComplete={autoComplete ?? autofillToken(field)}
      autoCapitalize={VERBATIM.has(type) ? "none" : undefined}
      spellCheck={VERBATIM.has(type) ? false : undefined}
      placeholder={placeholder ?? field.placeholder ?? ""}
      value={value ?? ""}
      min={numeric && v.min !== "" ? v.min : undefined}
      max={numeric && v.max !== "" ? v.max : undefined}
      step={type === "currency" ? "0.01" : numeric ? "any" : undefined}
      maxLength={!numeric && v.maxLength ? Number(v.maxLength) : undefined}
      readOnly={field.readOnly || undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnter();
        }
      }}
      onChange={(e) => onChange(coerce(type, e.target.value))}
      className={cn("bg-surface-card", controlSize(large), symbol && "pl-9", field.readOnly && "cursor-default opacity-80")}
      {...aria}
    />
  );
  if (!symbol) return input;
  return (
    <div className="relative">
      <span suppressHydrationWarning className="pointer-events-none absolute inset-y-0 left-[var(--input-box-padding-x,0.75rem)] flex items-center text-sm text-text-secondary" aria-hidden="true">
        {symbol}
      </span>
      {input}
    </div>
  );
}

export function LongTextInput({ field, value, onChange, disabled, aria, large, autoFocus, id }) {
  const max = Number(field.validation?.maxLength) || 0;
  const length = String(value ?? "").length;
  return (
    <div className="relative">
      <Textarea
        id={id || fieldIds(field).control}
        placeholder={field.placeholder || ""}
        value={value ?? ""}
        maxLength={max || undefined}
        readOnly={field.readOnly || undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className={textareaBox(large)}
        {...aria}
      />
      {max > 0 && (
        <span className="pointer-events-none absolute right-2.5 bottom-2 text-[11px] tabular-nums text-text-tertiary">
          {length}/{max}
        </span>
      )}
    </div>
  );
}

export function DropdownInput({ field, value, onChange, disabled, aria, large, placeholder, id }) {
  const options = field.options || [];
  return (
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled || field.readOnly}>
      <SelectTrigger id={id || fieldIds(field).control} className={selectBox(large)} {...aria}>
        <SelectValue placeholder={field.placeholder || placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
