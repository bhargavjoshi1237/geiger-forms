"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { hasOptions } from "@/lib/forms/field-types";
import { CONDITION_OPERATORS, operatorNeedsValue } from "@/lib/forms/logic";
import { RESPONSE_PRIORITIES, RESPONSE_STATUSES } from "@/lib/forms/schema";
import { cn } from "@/lib/utils";
import { AUTOMATION_ACTIONS } from "../constants";
import { AddButton, ChipsInput, FIELD_CLS, ItemCard, MergeTagHelp, Stack, TextArea, TextInput, inputFields, uid } from "./kit";

function MiniSelect({ value, onChange, options, placeholder, className }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", FIELD_CLS, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const IconBtn = ({ label, onClick, disabled, children, danger }) => (
  <Button type="button" size="icon" variant="ghost" aria-label={label} onClick={onClick} disabled={disabled} className={cn("h-8 w-8 text-text-secondary hover:bg-surface-active hover:text-foreground", danger && "hover:bg-red-500/10 hover:text-red-400")}>
    {children}
  </Button>
);

// Ordered approval chain; each step names its approvers by email.
export function ApprovalsSection({ settings, setGroup }) {
  const approval = settings.approval || {};
  const steps = approval.steps || [];
  const setSteps = (next) => setGroup("approval", { steps: next });
  const move = (i, dir) => {
    const next = [...steps];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setSteps(next);
  };
  return (
    <Stack>
      <SectionCard title="Approval routing" description="Responses wait as “Pending” until every step approves, in order. Any rejection closes the request.">
        <SettingsList>
          <SettingRow title="Require approval" checked={Boolean(approval.enabled)} onCheckedChange={(v) => setGroup("approval", { enabled: v, steps: v && !steps.length ? [{ id: uid("step"), name: "Manager", approvers: [] }] : steps })} />
        </SettingsList>
      </SectionCard>
      {approval.enabled ? (
        <SectionCard title="Steps" action={<AddButton onClick={() => setSteps([...steps, { id: uid("step"), name: `Step ${steps.length + 1}`, approvers: [] }])}>Add step</AddButton>}>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <ItemCard key={s.id}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge variant="neutral">Step {i + 1}</Badge>
                  <div className="flex items-center">
                    <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn label="Remove step" danger onClick={() => setSteps(steps.filter((x) => x.id !== s.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
                <div className="grid gap-3">
                  <Field label="Step name">
                    <TextInput value={s.name} onChange={(v) => setSteps(steps.map((x) => (x.id === s.id ? { ...x, name: v } : x)))} />
                  </Field>
                  <Field label="Approvers" hint="Any one of these people can decide this step. Leave empty to let any editor decide.">
                    <ChipsInput value={s.approvers || []} onChange={(v) => setSteps(steps.map((x) => (x.id === s.id ? { ...x, approvers: v } : x)))} placeholder="approver@company.com" />
                  </Field>
                </div>
              </ItemCard>
            ))}
            {!steps.length ? <p className="text-sm text-text-secondary">Add at least one step.</p> : null}
          </div>
        </SectionCard>
      ) : null}
    </Stack>
  );
}

function ConditionRow({ cond, fields, onChange, onRemove }) {
  const field = fields.find((f) => f.id === cond.fieldId);
  const needsValue = operatorNeedsValue(cond.operator);
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_150px_1fr_auto]">
      <MiniSelect value={cond.fieldId} onChange={(v) => onChange({ fieldId: v })} placeholder="Field…" options={fields.map((f) => ({ value: f.id, label: f.label || f.title }))} />
      <MiniSelect value={cond.operator || "equals"} onChange={(v) => onChange({ operator: v })} options={CONDITION_OPERATORS} />
      {needsValue ? (
        field && hasOptions(field.type) && field.options?.length ? (
          <MiniSelect value={cond.value} onChange={(v) => onChange({ value: v })} placeholder="Value…" options={field.options.map((o) => ({ value: o, label: o }))} />
        ) : (
          <TextInput value={cond.value} onChange={(v) => onChange({ value: v })} placeholder="Value" />
        )
      ) : (
        <span />
      )}
      <IconBtn label="Remove condition" danger onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </div>
  );
}

function ActionRow({ action, onChange, onRemove }) {
  const meta = AUTOMATION_ACTIONS.find((a) => a.value === action.type) || AUTOMATION_ACTIONS[0];
  const valueOptions = meta.input === "status" ? RESPONSE_STATUSES : meta.input === "priority" ? RESPONSE_PRIORITIES : null;
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
      <MiniSelect value={action.type} onChange={(v) => onChange({ type: v, value: "" })} options={AUTOMATION_ACTIONS} />
      {valueOptions ? (
        <MiniSelect value={action.value} onChange={(v) => onChange({ value: v })} placeholder="Choose…" options={valueOptions.map((v) => ({ value: v, label: v }))} />
      ) : meta.input === "none" ? (
        <span className="self-center text-xs text-text-tertiary">Uses this project&apos;s Flow settings.</span>
      ) : (
        <TextInput value={action.value} onChange={(v) => onChange({ value: v })} placeholder={meta.placeholder} />
      )}
      <IconBtn label="Remove action" danger onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </div>
  );
}

// IF conditions THEN actions, evaluated on every new response.
export function AutomationsSection({ form, settings, set }) {
  const automations = settings.automations || [];
  const fields = inputFields(form.fieldDefs);
  const update = (id, patch) => set("automations", automations.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const add = () => set("automations", [...automations, { id: uid("auto"), name: `Automation ${automations.length + 1}`, enabled: true, logic: "all", conditions: [], actions: [{ type: "add_tag", value: "" }] }]);

  return (
    <Stack>
      <SectionCard title="Automations" description="Run actions when a new response matches your conditions. No conditions = every response." action={<AddButton onClick={add}>Add automation</AddButton>}>
        {automations.length ? (
          <div className="space-y-3">
            {automations.map((a) => {
              const conditions = a.conditions || [];
              const actions = a.actions || [];
              const patchCond = (cid, patch) => update(a.id, { conditions: conditions.map((c) => (c.id === cid ? { ...c, ...patch } : c)) });
              const patchAction = (i, patch) => update(a.id, { actions: actions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <ItemCard key={a.id} onRemove={() => set("automations", automations.filter((x) => x.id !== a.id))} removeLabel="Remove automation">
                  <div className="grid gap-4 pr-8">
                    <div className="flex items-center gap-3">
                      <Switch checked={a.enabled !== false} onCheckedChange={(v) => update(a.id, { enabled: v })} aria-label="Automation enabled" />
                      <TextInput value={a.name} onChange={(v) => update(a.id, { name: v })} className="max-w-sm" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">When</span>
                        <Tabs value={a.logic === "any" ? "any" : "all"} onValueChange={(v) => update(a.id, { logic: v })}>
                          <TabsList>
                            <TabsTrigger value="all">All match</TabsTrigger>
                            <TabsTrigger value="any">Any matches</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      {conditions.map((c) => (
                        <ConditionRow key={c.id} cond={c} fields={fields} onChange={(patch) => patchCond(c.id, patch)} onRemove={() => update(a.id, { conditions: conditions.filter((x) => x.id !== c.id) })} />
                      ))}
                      <AddButton onClick={() => update(a.id, { conditions: [...conditions, { id: uid("cond"), fieldId: fields[0]?.id || "", operator: "equals", value: "" }] })} disabled={!fields.length}>
                        Condition
                      </AddButton>
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Then</span>
                      {actions.map((x, i) => (
                        <ActionRow key={i} action={x} onChange={(patch) => patchAction(i, patch)} onRemove={() => update(a.id, { actions: actions.filter((_, j) => j !== i) })} />
                      ))}
                      <AddButton onClick={() => update(a.id, { actions: [...actions, { type: "add_tag", value: "" }] })}>Action</AddButton>
                    </div>
                  </div>
                </ItemCard>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No automations yet.</p>
        )}
      </SectionCard>
    </Stack>
  );
}

// Document template rendered by the response print / PDF view.
export function DocumentsSection({ form, settings, setGroup }) {
  const doc = settings.documentTemplate || {};
  return (
    <Stack>
      <SectionCard title="Document template" description="Turns each response into a formatted document for printing or saving as PDF.">
        <SettingsList>
          <SettingRow title="Use a document template" description="Off = the print view lists every question and answer." checked={Boolean(doc.enabled)} onCheckedChange={(v) => setGroup("documentTemplate", { enabled: v })} />
        </SettingsList>
        {doc.enabled ? (
          <div className="mt-4 grid gap-4">
            <Field label="Document title">
              <TextInput value={doc.title} onChange={(v) => setGroup("documentTemplate", { title: v })} placeholder={`${form.title} — {Full name}`} />
            </Field>
            <Field label="Body" hint="Plain text with merge tags. Blank lines start new paragraphs; signatures and the audit trail are appended automatically.">
              <TextArea value={doc.body} onChange={(v) => setGroup("documentTemplate", { body: v })} rows={10} className="font-mono text-xs" />
            </Field>
            <MergeTagHelp fields={form.fieldDefs} />
          </div>
        ) : null}
      </SectionCard>
    </Stack>
  );
}
