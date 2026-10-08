"use client";

import { memo } from "react";
import { AlertTriangle, GitBranch, Plus, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { Input } from "@geiger/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { cn } from "@/lib/utils";
import { hasOptions, isInputField } from "@/lib/forms/field-types";
import { CONDITION_OPERATORS, normalizeOperator, operatorNeedsValue } from "@/lib/forms/logic";
import { makeFieldId } from "@/lib/forms/schema";

const NUMERIC_TYPES = new Set(["number", "currency", "rating", "scale", "nps", "product"]);
const NUMERIC_OPS = new Set(["gt", "gte", "lt", "lte"]);
const TEXT_ONLY_OPS = new Set(["starts_with"]);

function operatorsFor(source) {
  if (!source) return CONDITION_OPERATORS;
  if (NUMERIC_TYPES.has(source.type)) return CONDITION_OPERATORS.filter((o) => !TEXT_ONLY_OPS.has(o.value) && !o.value.includes("contains"));
  if (["date", "time", "datetime"].includes(source.type)) return CONDITION_OPERATORS.filter((o) => !o.value.includes("contains"));
  if (hasOptions(source.type) || source.type === "checkbox") return CONDITION_OPERATORS.filter((o) => !NUMERIC_OPS.has(o.value) && !TEXT_ONLY_OPS.has(o.value));
  return CONDITION_OPERATORS.filter((o) => !NUMERIC_OPS.has(o.value));
}

// Fields a condition can test: anything that stores a respondent answer.
export function conditionSources(fields, excludeId) {
  return fields.filter((f) => f.id !== excludeId && isInputField(f.type));
}

function ValueInput({ source, value, onChange }) {
  if (source?.type === "checkbox") {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full bg-background text-sm"><SelectValue placeholder="Choose…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Checked</SelectItem>
          <SelectItem value="false">Not checked</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  const options = (source?.options || []).filter(Boolean);
  if (options.length > 0) {
    const known = options.includes(value);
    return (
      <Select value={known ? value : undefined} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full bg-background text-sm"><SelectValue placeholder={value && !known ? `${value} (removed)` : "Choose an option…"} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  const numeric = NUMERIC_TYPES.has(source?.type);
  const inputType = numeric ? "number" : source?.type === "date" ? "date" : source?.type === "time" ? "time" : "text";
  return (
    <Input
      type={inputType}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={numeric ? "0" : "Value…"}
      className="h-8 bg-background text-sm"
    />
  );
}

// Shared ANY/ALL conditions editor used by fields, page breaks and branches.
export const ConditionsEditor = memo(function ConditionsEditor({
  conditions = [],
  logic = "any",
  onChange,
  sources,
  title = "Show this field only when",
  emptyText = "No conditions — always shown.",
  addLabel = "Add condition",
  compact = false,
}) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const update = (id, patch) => onChange({ conditions: conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const remove = (id) => onChange({ conditions: conditions.filter((c) => c.id !== id) });
  const add = () => {
    const first = sources[0];
    onChange({ conditions: [...conditions, { id: makeFieldId("cond"), fieldId: first?.id ?? "", operator: "equals", value: "" }] });
  };

  return (
    <div className={cn("rounded-lg border border-border bg-background", compact ? "p-2.5" : "p-3")}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          <span className="truncate">{title}</span>
        </span>
        {conditions.length > 1 ? (
          <ToggleGroup type="single" value={logic} onValueChange={(v) => v && onChange({ conditionLogic: v })} spacing={0.5} className="shrink-0 rounded-md border border-border bg-surface-subtle p-0.5">
            {["any", "all"].map((v) => (
              <ToggleGroupItem
                key={v}
                value={v}
                className="h-auto min-w-0 rounded px-2 py-0.5 text-[11px] font-medium uppercase text-text-secondary hover:bg-transparent hover:text-foreground data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
              >
                {v}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
      </div>

      {conditions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface-subtle px-3 py-3 text-center text-xs text-text-secondary">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond, i) => {
            const source = byId.get(cond.fieldId);
            const missing = cond.fieldId && !source;
            const op = normalizeOperator(cond.operator);
            const ops = operatorsFor(source);
            const opList = ops.some((o) => o.value === op) ? ops : [...ops, CONDITION_OPERATORS.find((o) => o.value === op) ?? { value: op, label: op }];
            return (
              <div key={cond.id} className="rounded-md border border-border bg-surface-subtle p-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 inline-flex h-5 w-10 shrink-0 items-center justify-center rounded border border-border bg-surface-card text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {i === 0 ? "IF" : logic === "all" ? "AND" : "OR"}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Select value={source ? cond.fieldId : undefined} onValueChange={(fieldId) => update(cond.id, { fieldId, value: "" })}>
                        <SelectTrigger className={cn("h-8 min-w-0 flex-1 bg-background text-sm", missing && "border-red-500/40 text-red-400")}>
                          <SelectValue placeholder={missing ? "Deleted field" : "Select a field…"} />
                        </SelectTrigger>
                        <SelectContent>
                          {sources.length === 0 ? <div className="px-2 py-1.5 text-xs text-text-tertiary">Add a question first.</div> : null}
                          {sources.map((f) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove condition" onClick={() => remove(cond.id)} className="shrink-0 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
                        <X />
                      </Button>
                    </div>
                    {missing ? (
                      <p className="flex items-center gap-1 text-[11px] text-red-400"><AlertTriangle className="h-3 w-3" />The field this condition used was deleted.</p>
                    ) : null}
                    <div className={cn("grid gap-2", operatorNeedsValue(op) && "sm:grid-cols-2")}>
                      <Select value={op} onValueChange={(operator) => update(cond.id, { operator })}>
                        <SelectTrigger className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {opList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {operatorNeedsValue(op) ? <ValueInput source={source} value={cond.value} onChange={(value) => update(cond.id, { value })} /> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={add} disabled={sources.length === 0} className="mt-2.5 h-7 w-full gap-1.5 text-xs">
        <Plus className="h-3.5 w-3.5" />{addLabel}
      </Button>
    </div>
  );
});
