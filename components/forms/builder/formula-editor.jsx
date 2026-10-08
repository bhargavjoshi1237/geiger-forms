"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Braces, CheckCircle2, Equal, FlaskConical } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@geiger/ui/dropdown-menu";
import { Input } from "@geiger/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import { Textarea } from "@geiger/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@geiger/ui/tooltip";
import { cn } from "@/lib/utils";
import { hasOptions } from "@/lib/forms/field-types";
import { checkFormula } from "@/lib/forms/formula";
import { evaluateFormula, formatMoney } from "@/lib/forms/logic";
import { formulaRefs } from "./doc-checks";
import { ControlLabel, FieldTypeIcon, SubtleNote } from "./builder-controls";

const FUNCTIONS = [
  { name: "IF", snippet: "IF(, , )", help: "IF(condition, then, else) — e.g. IF({Age} >= 18, 1, 0)" },
  { name: "SUM", snippet: "SUM()", help: "SUM(a, b, …) — adds values together" },
  { name: "MIN", snippet: "MIN()", help: "MIN(a, b, …) — smallest value" },
  { name: "MAX", snippet: "MAX()", help: "MAX(a, b, …) — largest value" },
  { name: "AVG", snippet: "AVG()", help: "AVG(a, b, …) — average of the values" },
  { name: "ROUND", snippet: "ROUND(, 2)", help: "ROUND(value, places) — rounds to the given decimal places" },
  { name: "ABS", snippet: "ABS()", help: "ABS(value) — absolute value" },
  { name: "DAYS", snippet: "DAYS(, )", help: "DAYS(end, start) — whole days between two dates" },
  { name: "LEN", snippet: "LEN()", help: "LEN(value) — number of characters (or selected items)" },
];

const NON_REFERENCEABLE = new Set(["heading", "content", "page"]);

function resolveRef(fields, name) {
  const key = name.toLowerCase().trim();
  return fields.find((f) => String(f.id).toLowerCase() === key || f.title?.toLowerCase().trim() === key || String(f.label || "").toLowerCase().trim() === key);
}

function defaultSample(field) {
  if (hasOptions(field.type)) return field.type === "multiselect" ? (field.options || []).slice(0, 1) : field.options?.[0] ?? "";
  if (field.type === "checkbox") return true;
  if (["date", "datetime", "time", "text", "textarea", "email", "url", "phone"].includes(field.type)) return "";
  if (field.type === "product") return field.config?.quantityMode === "fixed" ? true : 1;
  return 1;
}

function SampleInput({ field, value, onChange }) {
  if (hasOptions(field.type) && field.type !== "multiselect" && field.type !== "ranking" && field.type !== "matrix") {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-full bg-background text-xs"><SelectValue placeholder="Choose…" /></SelectTrigger>
        <SelectContent>{(field.options || []).filter(Boolean).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  if (field.type === "multiselect") {
    const picked = Array.isArray(value) ? value : [];
    return (
      <ToggleGroup type="multiple" value={picked} onValueChange={onChange} spacing={1} className="flex-wrap">
        {(field.options || []).filter(Boolean).map((o) => (
          <ToggleGroupItem
            key={o}
            value={o}
            className="h-auto min-w-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-normal text-text-tertiary transition-colors hover:bg-background hover:text-text-tertiary data-[state=on]:border-border-strong data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
          >
            {o}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }
  if (field.type === "checkbox" || (field.type === "product" && field.config?.quantityMode === "fixed")) {
    return <Switch checked={Boolean(value)} onCheckedChange={onChange} aria-label={`${field.title} sample`} />;
  }
  const type = field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : ["text", "textarea", "email", "url", "phone"].includes(field.type) ? "text" : "number";
  return <Input type={type} value={value ?? ""} onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} className="h-7 bg-background text-xs" />;
}

export function formatComputed(value, format, currency = "usd") {
  if (value == null) return "—";
  if (format === "currency") return formatMoney(value, currency);
  if (format === "percent") return `${value}%`;
  return String(value);
}

// Formula editor for calculated fields: references, function help, validation and a live preview on sample answers.
export function FormulaEditor({ field, fields, currency, scoring, onChange }) {
  const inputRef = useRef(null);
  const [samples, setSamples] = useState({});
  const formula = field.formula || "";
  const config = field.config || {};

  const referenceable = useMemo(() => fields.filter((f) => f.id !== field.id && !NON_REFERENCEABLE.has(f.type)), [fields, field.id]);
  const refs = useMemo(() => [...new Set(formulaRefs(formula))], [formula]);
  const resolved = useMemo(() => refs.map((r) => ({ ref: r, field: resolveRef(fields, r) })), [refs, fields]);
  const unknown = resolved.filter((r) => !r.field).map((r) => r.ref);
  const syntaxError = checkFormula(formula);
  const selfRef = resolved.some((r) => r.field?.id === field.id);

  const sampleFields = useMemo(() => {
    const seen = new Set();
    return resolved.map((r) => r.field).filter((f) => f && f.id !== field.id && f.type !== "calculated" && !seen.has(f.id) && seen.add(f.id));
  }, [resolved, field.id]);

  const answers = useMemo(() => {
    const out = {};
    for (const f of sampleFields) out[f.id] = f.id in samples ? samples[f.id] : defaultSample(f);
    return out;
  }, [sampleFields, samples]);
  const preview = syntaxError ? null : evaluateFormula(formula, fields, answers);

  const insert = (text, caretOffset = text.length) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? formula.length;
    const end = el?.selectionEnd ?? formula.length;
    const next = `${formula.slice(0, start)}${text}${formula.slice(end)}`;
    onChange({ formula: next });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + caretOffset;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <ControlLabel>Formula</ControlLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="xs" className="gap-1"><Braces />Insert field</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-60 overflow-y-auto border-border bg-surface-subtle">
              <DropdownMenuLabel className="text-xs text-text-tertiary">Reference a field</DropdownMenuLabel>
              {referenceable.length === 0 ? <div className="px-2 py-1.5 text-xs text-text-tertiary">No other fields yet.</div> : null}
              {referenceable.map((f) => (
                <DropdownMenuItem key={f.id} onSelect={() => insert(`{${f.title}}`)}>
                  <FieldTypeIcon type={f.type} className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="truncate">{f.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Equal className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
          <Textarea
            ref={inputRef}
            value={formula}
            onChange={(e) => onChange({ formula: e.target.value })}
            rows={2}
            spellCheck={false}
            placeholder="{Quantity} * {Unit price}"
            aria-label="Formula"
            className={cn("min-h-16 resize-y bg-background pl-8 font-mono text-sm text-sky-400", (syntaxError || unknown.length || selfRef) && "border-red-500/40")}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FUNCTIONS.map((fn) => (
            <Tooltip key={fn.name}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => insert(fn.snippet, fn.name.length + 1)}
                  className="h-auto rounded border-border bg-surface-card px-1.5 py-0.5 font-mono text-[10px] font-normal text-text-secondary shadow-none transition-colors hover:border-border-strong hover:bg-surface-card hover:text-foreground"
                >
                  {fn.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-60 text-xs">{fn.help}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        {syntaxError ? (
          <p className="flex items-center gap-1 text-[11px] text-red-400"><AlertTriangle className="h-3 w-3" />{syntaxError}</p>
        ) : unknown.length ? (
          <p className="flex items-center gap-1 text-[11px] text-red-400"><AlertTriangle className="h-3 w-3" />Unknown field{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{${u}}`).join(", ")}</p>
        ) : selfRef ? (
          <p className="flex items-center gap-1 text-[11px] text-red-400"><AlertTriangle className="h-3 w-3" />A formula can&apos;t reference its own field.</p>
        ) : formula.trim() ? (
          <p className="flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />Formula looks good.</p>
        ) : (
          <SubtleNote>Use {"{Field name}"} references with + − * / %, comparisons (&gt; &lt; ==), &amp;&amp; || and the functions above. Choice fields count their option points.</SubtleNote>
        )}
      </div>

      <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary"><FlaskConical className="h-3 w-3" />Live preview</p>
          {Object.keys(samples).length ? (
            <Button type="button" variant="ghost" size="xs" onClick={() => setSamples({})} className="h-auto gap-1 px-0 font-normal hover:bg-transparent has-[>svg]:px-0 text-[10px] text-text-tertiary hover:text-foreground">Reset samples</Button>
          ) : null}
        </div>
        <p className="mt-1 font-mono text-base text-sky-400">= {formatComputed(preview, config.format, currency)}</p>
        {sampleFields.length > 0 ? (
          <div className="mt-2.5 space-y-1.5 border-t border-sky-500/10 pt-2.5">
            <p className="text-[10px] text-text-tertiary">Sample answers</p>
            {sampleFields.map((f) => (
              <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-2">
                <span className="truncate text-xs text-muted-foreground" title={f.title}>{f.title}</span>
                <SampleInput field={f} value={answers[f.id]} onChange={(v) => setSamples((s) => ({ ...s, [f.id]: v }))} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[10px] text-text-tertiary">Reference a field to try sample answers.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <ControlLabel>Display format</ControlLabel>
          <Select value={config.format || "number"} onValueChange={(format) => onChange({ config: { ...config, format } })}>
            <SelectTrigger className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-start justify-between gap-3 pt-1">
          <ControlLabel hint={scoring ? "Adds this value to the response score." : "Takes effect when scoring is on."}>Count in score</ControlLabel>
          <Switch checked={config.countInScore !== false} onCheckedChange={(countInScore) => onChange({ config: { ...config, countInScore } })} aria-label="Count in score" />
        </div>
      </div>
    </div>
  );
}
