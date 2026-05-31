"use client";

import { Equal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileInput } from "@/components/ui/file-input";
import { cn } from "@/lib/utils";
import { getFieldType } from "@/lib/forms/field-types";
import { evaluateFormula } from "@/lib/forms/schema";

export function FormFieldRenderer({ field, value, onChange, error, allFields, answers }) {
  const meta = getFieldType(field.type);
  const label = field.label || field.title;

  if (field.type === "calculated") {
    const computed = evaluateFormula(field.formula, allFields, answers);
    return (
      <div className="rounded-md border border-[#1e3a5f] bg-[#0e1e2e] p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Equal className="h-3.5 w-3.5 text-[#60a5fa]" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#60a5fa]">
            Calculated — {field.title}
          </span>
        </div>
        <p className="font-mono text-sm text-[#93c5fd]">
          {computed == null ? "—" : computed}
        </p>
      </div>
    );
  }

  const labelEl = (
    <span className="flex items-center gap-1.5 text-sm font-medium text-[#d4d4d4]">
      {label}
      {field.required && <span className="text-[#ef4444]">*</span>}
    </span>
  );

  const describe = field.hint ? (
    <p className="mt-1 text-xs text-[#525252]">{field.hint}</p>
  ) : null;

  const errorEl = error ? <p className="mt-1 text-xs text-[#f87171]">{error}</p> : null;

  if (meta.input === "select") {
    const options = field.options?.length ? field.options : [];
    return (
      <fieldset className="block">
        <legend>{labelEl}</legend>
        {options.length === 0 ? (
          <p className="mt-2 text-xs text-[#525252]">No options configured.</p>
        ) : (
          <RadioGroup
            className="mt-2 grid gap-2 sm:grid-cols-2"
            value={value ?? ""}
            onValueChange={onChange}
          >
            {options.map((opt, i) => {
              const optId = `${field.id}-opt-${i}`;
              return (
                <label
                  key={opt}
                  htmlFor={optId}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    value === opt
                      ? "border-[#474747] bg-[#202020] text-white"
                      : "border-[#2a2a2a] bg-[#161616] text-[#d4d4d4] hover:border-[#474747]",
                  )}
                >
                  <RadioGroupItem id={optId} value={opt} />
                  {opt}
                </label>
              );
            })}
          </RadioGroup>
        )}
        {describe}
        {errorEl}
      </fieldset>
    );
  }

  if (meta.input === "checkbox") {
    return (
      <label
        htmlFor={field.id}
        className="flex cursor-pointer items-start gap-3 rounded-md border border-[#2a2a2a] bg-[#161616] p-3 text-sm text-[#a3a3a3] transition-colors hover:border-[#474747]"
      >
        <Checkbox
          id={field.id}
          className="mt-0.5"
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <span>
          {label}
          {field.required && <span className="ml-1 text-[#ef4444]">*</span>}
          {field.hint && <span className="mt-0.5 block text-xs text-[#525252]">{field.hint}</span>}
          {error && <span className="mt-1 block text-xs text-[#f87171]">{error}</span>}
        </span>
      </label>
    );
  }

  if (meta.input === "file") {
    return (
      <label className="block">
        {labelEl}
        <div className="mt-2">
          <FileInput
            onChange={(e) => onChange(e.target.files?.[0]?.name || "")}
          />
        </div>
        {describe}
        {errorEl}
      </label>
    );
  }

  if (meta.input === "textarea") {
    return (
      <label className="block">
        {labelEl}
        <Textarea
          className="mt-2 min-h-28"
          placeholder={field.placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {describe}
        {errorEl}
      </label>
    );
  }

  return (
    <label className="block">
      {labelEl}
      <Input
        className="mt-2"
        type={meta.input === "text" ? "text" : meta.input}
        placeholder={field.placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {describe}
      {errorEl}
    </label>
  );
}
