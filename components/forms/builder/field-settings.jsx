"use client";

import { useRef, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Input } from "@geiger/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import { Textarea } from "@geiger/ui/textarea";
import { cn } from "@/lib/utils";
import { AUTOFILL_OPTIONS, FIELD_GROUPS, FIELD_TYPE_LIST, autofillToken, hasOptions, isInputField, isLayoutField, isMultiChoice } from "@/lib/forms/field-types";
import { ConditionsEditor } from "./conditions-editor";
import { changeFieldType } from "./field-defaults";
import { FormulaEditor } from "./formula-editor";
import { FieldRow, FieldTokenMenu, FieldTypeIcon, NumberInput, SubtleNote, TextInput, ToggleRow } from "./builder-controls";
import { renderTypeSettings } from "./type-settings";

const PLACEHOLDER_TYPES = new Set(["text", "textarea", "email", "phone", "url", "number", "currency", "dropdown"]);
const TEXT_TYPES = new Set(["text", "textarea", "email", "url", "phone"]);
const MINMAX_TYPES = new Set(["number", "currency"]);
const QUIZ_TEXT_TYPES = new Set(["text", "number", "email", "url", "dropdown", "select", "multiselect", "picture", "multipicture"]);
const DEFAULT_TYPES = new Set(["text", "textarea", "email", "phone", "url", "number", "currency", "select", "dropdown", "picture", "checkbox", "date", "time", "datetime", "hidden", "rating", "scale", "nps", "opinion"]);
const LABEL_TEXT = { heading: "Heading", checkbox: "Statement", consent: "Consent text", statement: "Headline", video: "Video title" };
const BODY_LABELS = { content: "Text", heading: "Subheading", statement: "Details", image: "Caption", video: "Caption" };
const WIDTHS = [
  { value: "full", label: "Full" },
  { value: "half", label: "Half" },
  { value: "third", label: "Third" },
];

function cleanObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) if (v !== undefined && v !== "" && v !== null) out[k] = v;
  return Object.keys(out).length ? out : undefined;
}

function TypePicker({ field, onChange }) {
  return (
    <Select value={field.type} onValueChange={(type) => onChange(changeFieldType(field, type))}>
      <SelectTrigger className="h-8 w-full bg-surface-card text-sm"><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-80">
        {FIELD_GROUPS.map((group) => (
          <SelectGroup key={group}>
            <SelectLabel className="text-[11px] text-text-tertiary">{group}</SelectLabel>
            {FIELD_TYPE_LIST.filter((t) => t.group === group && t.type !== "page").map((t) => (
              <SelectItem key={t.type} value={t.type}>
                <FieldTypeIcon type={t.type} className="h-3.5 w-3.5 text-text-secondary" />{t.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function DefaultValueInput({ field, onChange }) {
  const value = field.defaultValue;
  const set = (v) => onChange({ defaultValue: v === "" || v === undefined ? undefined : v });
  if (field.type === "checkbox") return <Switch checked={Boolean(value)} onCheckedChange={(v) => set(v || undefined)} aria-label="Checked by default" />;
  if (field.type === "select" || field.type === "dropdown" || field.type === "picture") {
    return (
      <Select value={value || "__none"} onValueChange={(v) => set(v === "__none" ? undefined : v)}>
        <SelectTrigger className="h-8 w-full bg-surface-card text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">No default</SelectItem>
          {(field.options || []).filter(Boolean).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (["number", "currency", "rating", "scale", "nps", "opinion"].includes(field.type)) return <NumberInput value={value} onChange={set} />;
  const type = field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "datetime" ? "datetime-local" : "text";
  return <Input type={type} value={value ?? ""} onChange={(e) => set(e.target.value)} className="h-8 bg-surface-card text-sm" />;
}

function QuestionTab({ field, onChange, recallSources, allFields, formId, scoring, quiz, currency }) {
  const layout = isLayoutField(field.type);
  const input = isInputField(field.type);
  const labelText = LABEL_TEXT[field.type] || "Question";
  const bodyLabel = BODY_LABELS[field.type];
  const recallTarget = useRef(null);
  const trackRecall = (e) => {
    recallTarget.current = { key: e.currentTarget.dataset.recall, el: e.currentTarget };
  };

  // Inserts a recall token at the caret of the last focused text (the question by default, the body for text and image blocks).
  const insertRecall = (token) => {
    const { key, el } = recallTarget.current ?? { key: field.type === "content" || field.type === "image" ? "hint" : "label", el: null };
    const current = field[key] || "";
    const base = current || (key === "label" ? field.title || "" : "");
    const start = current && el ? el.selectionStart ?? base.length : base.length;
    const end = current && el ? el.selectionEnd ?? base.length : base.length;
    onChange({ [key]: `${base.slice(0, start)}${token}${base.slice(end)}` });
    requestAnimationFrame(() => {
      if (!el?.isConnected) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Field type"><TypePicker field={field} onChange={onChange} /></FieldRow>
        {field.type !== "content" && field.type !== "image" && field.type !== "consent" ? (
          <FieldRow label={labelText} hint={field.type === "checkbox" ? "What the respondent ticks to agree." : undefined}>
            <TextInput value={field.label} onChange={(label) => onChange({ label })} data-recall="label" onFocus={trackRecall} placeholder={field.title} />
          </FieldRow>
        ) : null}
      </div>

      {field.type === "consent" ? (
        <FieldRow label={labelText} hint="Shown next to the checkbox. Each response records a hash of this wording and the policy link, so later edits are detectable.">
          <Textarea value={field.label || ""} onChange={(e) => onChange({ label: e.target.value })} data-recall="label" onFocus={trackRecall} rows={3} className="min-h-14 resize-y bg-surface-card text-sm placeholder:text-text-tertiary" placeholder={field.title} />
        </FieldRow>
      ) : null}

      {bodyLabel ? (
        <FieldRow label={bodyLabel}>
          <Textarea value={field.hint || ""} onChange={(e) => onChange({ hint: e.target.value })} data-recall="hint" onFocus={trackRecall} rows={field.type === "content" ? 4 : field.type === "statement" ? 3 : 2} className="min-h-14 resize-y bg-surface-card text-sm placeholder:text-text-tertiary" placeholder={field.type === "content" ? "Supports merge tags like {Field Title}." : "Optional"} />
        </FieldRow>
      ) : null}

      {!layout && field.type !== "hidden" && field.type !== "total" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {PLACEHOLDER_TYPES.has(field.type) ? (
            <FieldRow label="Placeholder"><TextInput value={field.placeholder} onChange={(placeholder) => onChange({ placeholder })} placeholder="Shown inside the empty input" /></FieldRow>
          ) : null}
          <FieldRow label="Help text"><TextInput value={field.hint} onChange={(hint) => onChange({ hint })} data-recall="hint" onFocus={trackRecall} placeholder="Shown under the question" /></FieldRow>
          <FieldRow label="Info tooltip" className={PLACEHOLDER_TYPES.has(field.type) ? "sm:col-span-2" : undefined}>
            <TextInput value={field.info} onChange={(info) => onChange({ info })} placeholder="Extra context behind an (i) icon" />
          </FieldRow>
        </div>
      ) : null}

      {field.type !== "hidden" ? (
        <div className="flex items-center justify-between gap-3">
          <SubtleNote>Recall an earlier answer or hidden field here with a {"{Field name}"} token.</SubtleNote>
          <FieldTokenMenu fields={recallSources} onInsert={insertRecall} label="Recall" heading="Recall an answer" emptyText="No earlier questions yet." />
        </div>
      ) : null}

      {input && field.type !== "hidden" ? (
        <div className="grid gap-x-6 sm:grid-cols-2">
          <ToggleRow label="Required" hint="Respondents can't continue without it." checked={field.required} onCheckedChange={(required) => onChange({ required })} />
          {field.type !== "consent" ? (
            <ToggleRow label="Read-only" hint="Shows the default / prefilled value." checked={field.readOnly} onCheckedChange={(readOnly) => onChange({ readOnly })} />
          ) : null}
        </div>
      ) : null}

      {field.type === "calculated" ? (
        <FormulaEditor field={field} fields={allFields} currency={currency} scoring={scoring} onChange={onChange} />
      ) : (
        <TypeSettingsBlock field={field} onChange={onChange} formId={formId} scoring={scoring} quiz={quiz} currency={currency} />
      )}
    </div>
  );
}

function TypeSettingsBlock(props) {
  const content = renderTypeSettings(props);
  if (!content) return null;
  return <div className="border-t border-border pt-3.5">{content}</div>;
}

function ValidationTab({ field, onChange, quiz }) {
  const v = field.validation || {};
  const setRule = (patch) => onChange({ validation: cleanObject({ ...v, ...patch }) });
  const config = field.config || {};
  let patternError = null;
  if (v.pattern) {
    try {
      new RegExp(v.pattern);
    } catch {
      patternError = "This pattern isn't a valid regular expression.";
    }
  }
  const showQuizAnswer = quiz && QUIZ_TEXT_TYPES.has(field.type) && !hasOptions(field.type);
  const showQuizPoints = quiz && QUIZ_TEXT_TYPES.has(field.type);
  const rules = MINMAX_TYPES.has(field.type) || TEXT_TYPES.has(field.type) || isMultiChoice(field.type);

  return (
    <div className="space-y-3.5">
      {MINMAX_TYPES.has(field.type) ? (
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Minimum"><NumberInput value={v.min} onChange={(min) => setRule({ min })} placeholder="None" /></FieldRow>
          <FieldRow label="Maximum"><NumberInput value={v.max} onChange={(max) => setRule({ max })} placeholder="None" /></FieldRow>
        </div>
      ) : null}
      {TEXT_TYPES.has(field.type) ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Min length"><NumberInput min={0} value={v.minLength} onChange={(minLength) => setRule({ minLength })} placeholder="None" /></FieldRow>
            <FieldRow label="Max length"><NumberInput min={1} value={v.maxLength} onChange={(maxLength) => setRule({ maxLength })} placeholder="None" /></FieldRow>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldRow label="Pattern (regex)" hint="e.g. ^[A-Z]{2}\d{6}$">
              <TextInput value={v.pattern} onChange={(pattern) => setRule({ pattern })} className={cn("font-mono", patternError && "border-red-500/40")} placeholder="None" />
            </FieldRow>
            <FieldRow label="Error message"><TextInput value={v.patternMessage} onChange={(patternMessage) => setRule({ patternMessage })} placeholder="This value isn't in the expected format." /></FieldRow>
          </div>
          {patternError ? <p className="text-[11px] text-red-600 dark:text-red-400">{patternError}</p> : null}
        </>
      ) : null}
      {isMultiChoice(field.type) ? (
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Min selections"><NumberInput min={0} value={v.minSelect} onChange={(minSelect) => setRule({ minSelect })} placeholder="None" /></FieldRow>
          <FieldRow label="Max selections"><NumberInput min={1} value={v.maxSelect} onChange={(maxSelect) => setRule({ maxSelect })} placeholder="None" /></FieldRow>
        </div>
      ) : null}
      {!rules ? <SubtleNote>This field type has no extra validation rules{field.required ? "" : " — use Required on the Question tab"}.</SubtleNote> : null}

      {showQuizPoints ? (
        <div className="space-y-3 rounded-md border border-violet-500/20 bg-violet-500/5 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">Quiz</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {showQuizAnswer ? (
              <FieldRow label="Correct answer" hint="Matched case-insensitively.">
                <TextInput value={typeof field.correctAnswer === "string" ? field.correctAnswer : ""} onChange={(a) => onChange({ correctAnswer: a || undefined })} placeholder="Not graded" />
              </FieldRow>
            ) : (
              <SubtleNote className="self-center">Mark correct choices on the Question tab.</SubtleNote>
            )}
            <FieldRow label="Points"><NumberInput min={0} value={config.points ?? 1} onChange={(points) => onChange({ config: { ...config, points } })} /></FieldRow>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Which saved browser detail (name, company, city…) fills this short-text field; Auto infers it from the title.
function AutofillSelect({ field, onChange }) {
  const inferred = autofillToken({ ...field, config: undefined });
  const inferredLabel = AUTOFILL_OPTIONS.find((o) => o.value === inferred)?.label;
  return (
    <FieldRow label="Browser autofill" hint="Lets browsers and password managers fill this from the respondent's saved details.">
      <Select value={field.config?.autocomplete || "auto"} onValueChange={(v) => onChange({ config: { ...field.config, autocomplete: v === "auto" ? undefined : v } })}>
        <SelectTrigger className="h-8 w-full bg-surface-card text-sm"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="auto">{inferredLabel ? `Auto (${inferredLabel})` : "Auto (none detected)"}</SelectItem>
          {AUTOFILL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </FieldRow>
  );
}

function AdvancedTab({ field, onChange }) {
  const input = isInputField(field.type);
  return (
    <div className="space-y-3.5">
      {field.type !== "hidden" ? (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground">Width</span>
          <Tabs value={field.width || "full"} onValueChange={(width) => onChange({ width })}>
            <TabsList className="w-full sm:w-fit">
              {WIDTHS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}
      {input ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {DEFAULT_TYPES.has(field.type) ? (
            <FieldRow label="Default value"><DefaultValueInput field={field} onChange={onChange} /></FieldRow>
          ) : null}
          <FieldRow label="Prefill key" hint={field.prefillKey ? `Prefilled from ?${field.prefillKey}=… in the form link.` : "URL parameter that prefills this field."}>
            <TextInput value={field.prefillKey} onChange={(prefillKey) => onChange({ prefillKey: prefillKey.replace(/[^a-zA-Z0-9_-]/g, "") || undefined })} placeholder="e.g. email" className="font-mono" />
          </FieldRow>
          {field.type === "text" ? <AutofillSelect field={field} onChange={onChange} /> : null}
        </div>
      ) : null}
      {input ? (
        <div className={cn("rounded-md border p-3", field.sensitive ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-background")}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                {field.sensitive ? <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> : <ShieldCheck className="h-3.5 w-3.5 text-text-secondary" />}
                Sensitive data (ePHI)
              </p>
              <p className="mt-1 text-[11px] leading-4 text-text-tertiary">
                Encrypted at rest and masked in the inbox, exports and notifications. Teammates must reveal it explicitly, and every reveal is logged.
              </p>
            </div>
            <Switch checked={Boolean(field.sensitive)} onCheckedChange={(sensitive) => onChange({ sensitive })} aria-label="Sensitive data" className="shrink-0" />
          </div>
        </div>
      ) : null}
      <SubtleNote>
        Merge tag <code className="rounded bg-surface-card px-1 font-mono text-[10px] text-text-secondary">{`{${field.title}}`}</code> · ID <code className="rounded bg-surface-card px-1 font-mono text-[10px] text-text-secondary">{field.id}</code>
      </SubtleNote>
    </div>
  );
}

// Tabbed settings for one field: question, validation, logic and advanced.
export function FieldSettings({ field, onChange, sources, recallSources, allFields, formId, scoring, quiz, currency }) {
  const [tab, setTab] = useState("question");
  const input = isInputField(field.type);
  const tabs = [
    { value: "question", label: field.type === "calculated" ? "Formula" : "Question" },
    ...(input && field.type !== "hidden" ? [{ value: "validation", label: "Validation" }] : []),
    { value: "logic", label: field.conditions?.length ? `Logic · ${field.conditions.length}` : "Logic" },
    { value: "advanced", label: "Advanced" },
  ];
  const active = tabs.some((t) => t.value === tab) ? tab : "question";

  return (
    <div className="space-y-4">
      <Tabs value={active} onValueChange={setTab}>
        <TabsList className="w-full">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {active === "question" ? <QuestionTab field={field} onChange={onChange} recallSources={recallSources} allFields={allFields} formId={formId} scoring={scoring} quiz={quiz} currency={currency} /> : null}
      {active === "validation" ? <ValidationTab field={field} onChange={onChange} quiz={quiz} /> : null}
      {active === "logic" ? (
        <ConditionsEditor
          conditions={field.conditions || []}
          logic={field.conditionLogic}
          sources={sources}
          onChange={onChange}
          title="Show this field only when"
          emptyText="No conditions — this field is always shown."
        />
      ) : null}
      {active === "advanced" ? <AdvancedTab field={field} onChange={onChange} /> : null}
    </div>
  );
}
