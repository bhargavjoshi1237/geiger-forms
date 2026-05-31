"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  Calendar,
  ChevronDown,
  CircleHelp,
  Clock,
  Equal,
  EyeOff,
  Eye,
  FileText,
  FolderOpen,
  FunctionSquare,
  GitBranch,
  GripVertical,
  Hash,
  History,
  Target,
  Link2,
  Mail,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  Undo2,
  Redo2,
  Copy,
  Globe,
  CheckCircle2 as CheckIcon,
  SlidersHorizontal,
  SplitSquareVertical,
  Star,
  Wand2,
  X,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hydrateFields, serializeBuilderDoc } from "@/lib/forms/builder";
import { FIELD_TYPE_LIST, getFieldIcon } from "@/lib/forms/field-types";
import { blankFormDoc, titleFromSlug } from "@/lib/forms/schema";
import { getFormBySlug, saveFormBySlug, setFormStatus } from "@/lib/supabase/forms";
import { useVersions } from "@/lib/hooks/use-versions";
import { PublishDialog } from "@/components/forms/publish-dialog";

const SAVE_DEBOUNCE_MS = 1000;

const OPERATORS = ["Equals", "Contains", "Does Not Equal", "Is Empty"];

export function FormBuilderTopbarActions({ formId = "" }) {
  const [favourite, setFavourite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    let active = true;
    getFormBySlug(formId)
      .then((form) => active && form && setIsPublished(form.status === "Published"))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [formId]);

  const applyStatus = async (status) => {
    let form = await getFormBySlug(formId);
    if (!form) {
      form = await saveFormBySlug(formId, { title: titleFromSlug(formId) });
    }
    await setFormStatus(form.id, status);
    setIsPublished(status === "Published");
  };

  const copyLink = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${formId}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label="Favourite" onClick={() => setFavourite((v) => !v)} className={favourite ? "text-white" : undefined}>
        <Star className={cn("h-4 w-4", favourite && "fill-white")} />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={copyLink} aria-label={copied ? "Copied!" : "Copy link"} className={copied ? "text-[#4ade80]" : undefined}>
        {copied ? <CheckIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Preview" onClick={() => { if (typeof window !== "undefined") window.open(`/form/${formId}`, "_blank", "noopener"); }}><Eye className="h-4 w-4" /></Button>
      <Button
        type="button"
        size="sm"
        onClick={() => setPublishOpen(true)}
        className={cn("gap-1.5 h-8", isPublished ? "border border-[#166534] bg-[#0d2218] text-[#4ade80] hover:bg-[#0f2a1d]" : "")}
      >
        {isPublished ? (
 <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isPublished && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isPublished ? "bg-[#4ade80]" : "bg-[#525252]"}`} />
              </span>
        ) : (
          <Globe className="h-3.5 w-3.5" />
        )}
        {isPublished ? "Live" : "Publish"}
      </Button>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        slug={formId}
        status={isPublished ? "Published" : "Draft"}
        onChange={applyStatus}
      />
    </>
  );
}

function TinySwitch({ checked = false, onCheckedChange, label }) {
  return <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />;
}

function FormIntroCard({ title, description, onTitleChange, onDescriptionChange }) {
  return (
    <Card className="relative p-6">
      <Input value={title} onChange={(e) => onTitleChange(e.target.value)} aria-label="Form title" className="h-10 border-transparent bg-transparent px-0 text-[26px] font-semibold leading-tight text-white" />
      <Textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} aria-label="Form description" className="mt-4 min-h-24 resize-none border-[#2a2a2a] bg-[#202020] pr-3 text-[13px] leading-5 text-[#d4d4d4]" />
    </Card>
  );
}

function StepDivider({ step, onTitleChange, onRemove }) {
  return (
    <div className="relative flex items-center gap-3">
      <div className="h-px flex-1 bg-[#2a2a2a]" />
      <div className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-1">
        <SplitSquareVertical className="h-3.5 w-3.5 shrink-0 text-[#525252]" />
        <Input value={step.title} onChange={(e) => onTitleChange(e.target.value)} className="h-auto w-32 border-transparent bg-transparent px-0 py-0 text-xs font-medium text-[#a3a3a3] focus:border-transparent focus:text-white" placeholder="Step name..." />
        <button type="button" onClick={onRemove} className="text-[#525252] transition-colors hover:text-[#a3a3a3]"><X className="h-3 w-3" /></button>
      </div>
      <div className="h-px flex-1 bg-[#2a2a2a]" />
    </div>
  );
}

function ConditionsPanel({ conditions, allFields, onAdd, onUpdate, onRemove }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-[#d4d4d4]">
          <GitBranch className="h-4 w-4 text-[#737373]" />
          Show This Field Only When
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#2a2a2a] bg-[#1a1a1a] px-3 py-4 text-center">
          <p className="text-xs text-[#737373]">No conditions yet — this field is always visible.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {conditions.map((cond, i) => {
            const needsValue = cond.operator !== "Is Empty";
            return (
              <div key={cond.id} className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-3">
                <div className="flex gap-2">
                  <Badge className="mt-1.5 h-6 w-9 shrink-0 justify-center rounded-md px-0 text-[10px] font-semibold tracking-wide text-[#a3a3a3]">
                    {i === 0 ? "IF" : "OR"}
                  </Badge>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select value={cond.fieldId} onValueChange={(value) => onUpdate(cond.id, { fieldId: value })}>
                        <SelectTrigger className="h-9 flex-1 text-sm">
                          <SelectValue placeholder="Select a field…" />
                        </SelectTrigger>
                        <SelectContent>
                          {allFields.map((f) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(cond.id)}
                        aria-label="Remove condition"
                        className="h-9 w-9 shrink-0 text-[#737373] hover:bg-[#2a0808] hover:text-[#f87171]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className={cn("grid gap-2", needsValue && "sm:grid-cols-2")}>
                      <Select value={cond.operator} onValueChange={(value) => onUpdate(cond.id, { operator: value })}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {needsValue && (
                        <Input
                          value={cond.value}
                          onChange={(e) => onUpdate(cond.id, { value: e.target.value })}
                          placeholder="Enter a value…"
                          className="h-9 text-sm text-[#d4d4d4]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ options, onChange }) {
  const update = (i, value) => onChange(options.map((o, idx) => (idx === i ? value : o)));
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, `Option ${options.length + 1}`]);

  return (
    <div className="mt-3">
      <span className="text-xs font-medium text-[#e7e7e7]">Choices</span>
      <div className="mt-2 space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={opt}
              onChange={(e) => update(i, e.target.value)}
              className="h-8 flex-1 bg-[#161616] text-sm"
              placeholder={`Option ${i + 1}`}
            />
            <button type="button" onClick={() => remove(i)} className="text-[#525252] transition-colors hover:text-[#ef4444]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {options.length === 0 && <p className="text-[10px] text-[#525252]">No choices yet — add at least one.</p>}
      </div>
      <button type="button" onClick={add} className="mt-2 flex items-center gap-1 text-[10px] text-[#737373] transition-colors hover:text-white">
        <Plus className="h-3 w-3" />Add Choice
      </button>
    </div>
  );
}

function FieldCard({ field, allFields, onChange, onRemove, dragging, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const hasConditions = field.conditions.length > 0;
  const isCalculated = field.type === "calculated";
  const [showConditions, setShowConditions] = useState(() => field.conditions.length > 0);

  const addCondition = () => onChange({ conditions: [...field.conditions, { id: `c-${Date.now()}`, fieldId: "", operator: "equals", value: "" }] });
  const updateCondition = (id, patch) => onChange({ conditions: field.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const removeCondition = (id) => onChange({ conditions: field.conditions.filter((c) => c.id !== id) });

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn("group relative transition-all duration-150", dragging && "opacity-30 scale-[0.99]")}
    >
      <button
        type="button"
        aria-label="Drag field"
        className="absolute -left-8 top-3 z-10 cursor-grab rounded p-1 text-[#525252] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#a3a3a3] active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card className="w-full p-4">
            <Accordion type="single" collapsible defaultValue="details">
              <AccordionItem value="details" className="border-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Input value={field.title} onChange={(e) => onChange({ title: e.target.value })} aria-label={`${field.title} field name`} className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-0 text-base font-semibold text-white" />
                    {isCalculated && (
                      <Badge className="shrink-0 border-[#1e3a5f] bg-[#0e1e2e] px-2 py-0.5 text-[11px] font-medium text-[#60a5fa]">Calc</Badge>
                    )}
                    {hasConditions && (
                      <Badge className="text-[11px] text-[#737373]">
                        <GitBranch className="h-3 w-3" />{field.conditions.length}
                      </Badge>
                    )}
                    {field.required && (
                      <Badge className="shrink-0 border-[#474747] bg-[#242424] px-2 py-0.5 text-[11px] text-[#a3a3a3]">Required</Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AccordionTrigger
                      aria-label={`${field.title} details`}
                      className="h-8 w-8 flex-none items-center justify-center rounded-md p-0 py-0 text-[#737373] hover:bg-[#242424] hover:text-white hover:no-underline data-[state=open]:bg-[#242424] data-[state=open]:text-white [&>svg.accordion-chevron]:hidden"
                    >
                      <ChevronDown className="h-4 w-4" /><span className="sr-only">Toggle details</span>
                    </AccordionTrigger>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove field" className="h-8 w-8 text-[#737373] hover:text-white" onClick={onRemove}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <AccordionContent className="pb-0 pt-4">
                  {isCalculated ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#e7e7e7]">Formula</label>
                        <div className="relative">
                          <Equal className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
                          <Input value={field.formula ?? ""} onChange={(e) => onChange({ formula: e.target.value })} placeholder="{Field A} + {Field B} x 1.5" className="h-9 pl-8 pr-3 font-mono text-sm text-[#60a5fa]" />
                        </div>
                        <p className="mt-1.5 text-[10px] text-[#525252]">Reference other fields using curly braces: {"{Field Name}"}. Supports +, −, ×, ÷, and IF statements.</p>
                      </div>
                      <div className="rounded-md border border-[#1e3a5f] bg-[#0a1929] px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[#525252]">Live preview</p>
                        <p className="mt-1 font-mono text-sm text-[#93c5fd]">= 84.0 pts</p>
                        <p className="mt-0.5 text-[10px] text-[#525252]">Calculated from current field values</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="block">
                        <span className="text-xs font-medium text-[#e7e7e7]">Field type</span>
                        <Select
                          value={field.type}
                          onValueChange={(type) =>
                            onChange({ type, select: type === "select", Icon: getFieldIcon(type) })
                          }
                        >
                          <SelectTrigger className="mt-2 h-9 bg-[#161616] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPE_LIST.filter((t) => t.type !== "calculated").map((t) => (
                              <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="mt-3 block">
                        <span className="text-xs font-medium text-[#e7e7e7]">Question label</span>
                        <Input value={field.firstValue} onChange={(e) => onChange({ firstValue: e.target.value })} className={cn("mt-2 h-9 bg-[#161616] text-sm", field.required && "border-[#737373] shadow-[0_0_0_1px_rgba(255,255,255,0.18)]")} />
                      </label>
                      <label className="mt-3 block">
                        <span className="text-xs font-medium text-[#e7e7e7]">{field.type === "file" ? "Hint" : "Placeholder"}</span>
                        <Input value={field.secondValue} onChange={(e) => onChange({ secondValue: e.target.value })} className="mt-2 h-9 bg-[#161616] text-sm text-[#a3a3a3]" />
                      </label>
                      {field.type === "select" && (
                        <OptionsEditor
                          options={field.options || []}
                          onChange={(options) => onChange({ options })}
                        />
                      )}
                    </>
                  )}

                  {showConditions && (
                    <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                      <ConditionsPanel
                        conditions={field.conditions}
                        allFields={allFields.filter((f) => f.id !== field.id)}
                        onAdd={addCondition}
                        onUpdate={updateCondition}
                        onRemove={removeCondition}
                      />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52 bg-[#202020] border-[#333333] shadow-xl">
          {!isCalculated && (
            <>
              <ContextMenuCheckboxItem checked={field.info} onCheckedChange={(info) => onChange({ info })}>
                <CircleHelp className="h-3.5 w-3.5" />Info tooltip
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem checked={field.required} onCheckedChange={(required) => onChange({ required })}>
                Required field
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator className="bg-[#333333]" />
            </>
          )}
          <ContextMenuCheckboxItem
            checked={showConditions}
            onCheckedChange={(v) => setShowConditions(v)}
          >
            <GitBranch className="h-3.5 w-3.5" />Conditional visibility
            {hasConditions && (
              <span className="ml-auto rounded-full border border-[#2a2a2a] px-1.5 py-0 text-[10px] text-[#525252]">{field.conditions.length}</span>
            )}
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator className="bg-[#333333]" />
          <ContextMenuItem variant="destructive" onSelect={onRemove}>
            <X className="h-3.5 w-3.5" />Remove field
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function SidebarField({ field, onToggle }) {
  const Icon = field.Icon || Mail;
  return (
    <div className="flex h-8 items-center gap-2 text-sm text-[#d4d4d4]">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#737373]" />
      <Icon className="h-4 w-4 shrink-0 text-[#a3a3a3]" />
      <span className="min-w-0 flex-1 truncate">{field.title}</span>
      {field.type === "calculated" && <span className="mr-1 rounded-full border border-[#1e3a5f] bg-[#0e1e2e] px-1 text-[9px] text-[#60a5fa]">Calc</span>}
      <TinySwitch checked={field.included} onCheckedChange={onToggle} label={`${field.title} included`} />
    </div>
  );
}

function FieldGroup({ title, icon: Icon, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="flex h-8 items-center gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-medium text-[#a3a3a3] transition-colors hover:text-white" aria-expanded={open}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{title}</span>
          <Badge className="ml-1 rounded-full px-1.5 py-0 text-[10px]">{count}</Badge>
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#a3a3a3] transition-colors hover:bg-[#242424] hover:text-white">
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

function CoverChoice({ label, active, onClick }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className={cn("h-[64px] flex-1 flex-col gap-1 bg-[#161616] text-xs", active && "border-[#737373] bg-[#202020] text-white")}>
      <FileText className="h-5 w-5" />{label}
    </Button>
  );
}

function ResizeHandle({ label, onMouseDown }) {
  return (
    <button type="button" aria-label={label} title={label} onMouseDown={onMouseDown} className="absolute bottom-1 right-1 grid h-7 w-7 cursor-nwse-resize place-items-center rounded-md p-1 text-zinc-400 opacity-50 transition-opacity hover:bg-[#242424] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#474747]">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M 6 10 L 10 6 L 10 10 Z" fill="currentColor" />
        <path d="M 2 10 L 10 2 L 10 4 L 4 10 Z" fill="currentColor" />
      </svg>
    </button>
  );
}

function SidebarRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-[#d4d4d4] leading-snug">{label}</p>
        {hint && <p className="mt-0.5 text-[10px] text-[#525252]">{hint}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function RightSidebar({
  fields, onToggleField, onAddField, onAddCalculated,
  coverStyle, onCoverStyleChange, showIcon, onShowIconChange,
  branding, onBrandingChange, submitAnother, onSubmitAnotherChange,
  openDate, closeDate, onOpenDateChange, onCloseDateChange,
  steps, onAddStep, onUpdateStep, onRemoveStep,
  responseLimit, onResponseLimitChange,
  thankYouType, thankYouText, thankYouUrl, onThankYouTypeChange, onThankYouTextChange, onThankYouUrlChange,
  versions, versionsLoading, onRestoreVersion, onOpenSaveDialog,
  scoringEnabled, onScoringEnabledChange, highThreshold, onHighThresholdChange, mediumThreshold, onMediumThresholdChange,
  branchingEnabled, onBranchingEnabledChange, branches, onAddBranch, onUpdateBranch, onRemoveBranch,
}) {
  const included = fields.filter((f) => f.included);
  const excluded = fields.filter((f) => !f.included);
  const now = new Date().toISOString().slice(0, 10);
  const scheduleActive = openDate || closeDate;

  return (
    <aside className="hidden w-[286px] shrink-0 flex-col border-l border-[#2a2a2a] bg-[#1a1a1a] lg:flex">
      <div className="scrollbar-subtle flex-1 overflow-y-auto px-4 py-4">
        <Accordion type="multiple" defaultValue={["fields", "form-style", "submission"]}>

          <AccordionItem value="fields" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-2 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Fields</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="space-y-3">
                <FieldGroup title="Included" icon={Eye} count={included.length}>
                  {included.map((f) => <SidebarField key={f.id} field={f} onToggle={() => onToggleField(f.id)} />)}
                </FieldGroup>
                <FieldGroup title="Excluded" icon={EyeOff} count={excluded.length}>
                  {excluded.map((f) => <SidebarField key={f.id} field={f} onToggle={() => onToggleField(f.id)} />)}
                </FieldGroup>
              </div>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onAddField}>
                  <Plus className="h-3.5 w-3.5" />Field
                </Button>
                <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onAddCalculated}>
                  <FunctionSquare className="h-3.5 w-3.5" />Calculated
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="steps" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2">
                <SplitSquareVertical className="h-4 w-4" />Steps
                {steps.length > 0 && <Badge className="ml-1 rounded-full px-1.5 py-0 text-[10px]">{steps.length}</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 space-y-2">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#161616] px-2.5 py-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#737373]">{i + 1}</span>
                  <Input value={s.title} onChange={(e) => onUpdateStep(s.id, e.target.value)} className="h-auto min-w-0 flex-1 border-transparent bg-transparent px-0 py-0 text-xs text-[#d4d4d4] focus:border-transparent" placeholder="Step name..." />
                  <button type="button" onClick={() => onRemoveStep(s.id)} className="text-[#525252] hover:text-[#a3a3a3]"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full h-8 text-xs" onClick={onAddStep}><Plus className="h-3.5 w-3.5" />Add step</Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="branches" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2">
                <GitBranch className="h-4 w-4" />Branches
                {branchingEnabled && branches.length > 0 && (
                  <Badge className="ml-1 rounded-full px-1.5 py-0 text-[10px]">{branches.length}</Badge>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#d4d4d4]">Enable branching paths</p>
                    <p className="text-[10px] text-[#525252]">Route respondents through different section sequences</p>
                  </div>
                  <Switch checked={branchingEnabled} onCheckedChange={onBranchingEnabledChange} />
                </div>
                {branchingEnabled && (
                  <div className="space-y-2">
                    {branches.map((b) => (
                      <div key={b.id} className="space-y-2 rounded-md border border-[#2a2a2a] bg-[#161616] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={b.name}
                            onChange={(e) => onUpdateBranch(b.id, { name: e.target.value })}
                            className="h-auto flex-1 border-transparent bg-transparent px-0 py-0 text-xs font-medium text-[#d4d4d4] focus:border-transparent"
                            placeholder="Branch name..."
                          />
                          <button type="button" onClick={() => onRemoveBranch(b.id)} className="shrink-0 text-[#525252] hover:text-[#a3a3a3]">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wide text-[#525252]">Condition</p>
                          <Input
                            value={b.condition}
                            onChange={(e) => onUpdateBranch(b.id, { condition: e.target.value })}
                            className="h-6 bg-[#1a1a1a] px-2 text-xs text-[#d4d4d4]"
                            placeholder="e.g. Priority equals Urgent"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-wide text-[#525252]">Named outcome</p>
                          <Input
                            value={b.outcome}
                            onChange={(e) => onUpdateBranch(b.id, { outcome: e.target.value })}
                            className="h-6 bg-[#1a1a1a] px-2 text-xs text-[#d4d4d4]"
                            placeholder="e.g. Escalated"
                          />
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full h-8 text-xs" onClick={onAddBranch}>
                      <Plus className="h-3.5 w-3.5" />Add branch
                    </Button>
                    <p className="text-[10px] leading-4 text-[#525252]">
                      Each named outcome is tracked separately in analytics with its own completion rate and drop-off data.
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="form-style" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2"><Wand2 className="h-4 w-4" />Form Style</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <p className="mb-3 inline-flex items-center gap-2 text-xs text-[#a3a3a3]"><FileText className="h-3.5 w-3.5" />Cover Image</p>
              <div className="flex gap-3">
                <CoverChoice label="No Cover" active={coverStyle === "none"} onClick={() => onCoverStyleChange("none")} />
                <CoverChoice label="Cover Image" active={coverStyle === "cover"} onClick={() => onCoverStyleChange("cover")} />
              </div>
              <label className="mt-4 flex h-8 items-center justify-between text-sm font-medium text-[#d4d4d4]">
                Show Icon<TinySwitch checked={showIcon} onCheckedChange={onShowIconChange} label="Show icon" />
              </label>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="schedule" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />Schedule
                {scheduleActive && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#4ade80]" />}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]">Open date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
                  <Input type="date" value={openDate} onChange={(e) => onOpenDateChange(e.target.value)} className="h-8 pl-8 pr-2 text-xs text-[#d4d4d4] [color-scheme:dark]" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]">Close date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
                  <Input type="date" value={closeDate} onChange={(e) => onCloseDateChange(e.target.value)} className="h-8 pl-8 pr-2 text-xs text-[#d4d4d4] [color-scheme:dark]" />
                </div>
              </div>
              {scheduleActive && <button type="button" onClick={() => { onOpenDateChange(""); onCloseDateChange(""); }} className="text-[10px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Clear schedule</button>}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="submission" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2"><FolderOpen className="h-4 w-4" />Submission</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 space-y-0">
              <SidebarRow label={<span className="inline-flex items-center gap-2">Geiger branding <Badge className="rounded-full px-1.5 py-0 text-[9px] uppercase">Pro</Badge></span>}>
                <TinySwitch checked={branding} onCheckedChange={onBrandingChange} label="Geiger branding" />
              </SidebarRow>
              <SidebarRow label='"Submit Another" button'>
                <TinySwitch checked={submitAnother} onCheckedChange={onSubmitAnotherChange} label="Submit another" />
              </SidebarRow>

              <div className="border-t border-[#242424] pt-3 mt-1">
                <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]"><Hash className="mr-1 inline h-3 w-3" />Response limit</label>
                <div className="flex gap-2">
                  <Input type="number" min="1" value={responseLimit} onChange={(e) => onResponseLimitChange(e.target.value)} placeholder="No limit" className="h-8 flex-1 px-2.5 text-xs text-[#d4d4d4]" />
                  {responseLimit && <button type="button" onClick={() => onResponseLimitChange("")} className="text-[#525252] hover:text-[#a3a3a3]"><X className="h-3.5 w-3.5" /></button>}
                </div>
              </div>

              <div className="border-t border-[#242424] pt-3 mt-3">
                <p className="mb-2 text-xs font-medium text-[#a3a3a3]">Post-submission screen</p>
                <div className="flex gap-1 rounded-md border border-[#2a2a2a] bg-[#161616] p-1">
                  {["message", "redirect"].map((type) => (
                    <button key={type} type="button" onClick={() => onThankYouTypeChange(type)} className={cn("flex-1 rounded py-1 text-xs font-medium capitalize transition-colors", thankYouType === type ? "bg-[#2a2a2a] text-white" : "text-[#737373] hover:text-[#a3a3a3]")}>
                      {type === "message" ? "Message" : "Redirect"}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  {thankYouType === "message" ? (
                    <Textarea value={thankYouText} onChange={(e) => onThankYouTextChange(e.target.value)} rows={3} placeholder="Thank you message..." className="min-h-20 resize-none px-2.5 py-2 text-xs text-[#d4d4d4]" />
                  ) : (
                    <div className="relative">
                      <Link2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
                      <Input type="url" value={thankYouUrl} onChange={(e) => onThankYouUrlChange(e.target.value)} placeholder="https://..." className="h-8 pl-8 pr-2.5 text-xs text-[#d4d4d4]" />
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scoring" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2"><Target className="h-4 w-4" />Auto-triage</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#d4d4d4]">Enable response scoring</p>
                    <p className="text-[10px] text-[#525252]">Score each submission; auto-assign priority</p>
                  </div>
                  <Switch checked={scoringEnabled} onCheckedChange={onScoringEnabledChange} />
                </div>
                {scoringEnabled && (
                  <div className="space-y-3 rounded-md border border-[#2a2a2a] bg-[#161616] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[#525252]">Priority thresholds</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 rounded-full border border-[#7f1d1d] bg-[#2a0808] px-2 py-0.5 text-center text-[10px] font-medium text-[#f87171]">High</span>
                        <span className="text-xs text-[#525252]">≥</span>
                        <Input
                          type="number"
                          value={highThreshold}
                          onChange={(e) => onHighThresholdChange(e.target.value)}
                          className="h-6 w-16 bg-[#1a1a1a] px-2 text-xs"
                          min="0"
                        />
                        <span className="text-xs text-[#525252]">points</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 rounded-full border border-[#7c2d12] bg-[#2a1a08] px-2 py-0.5 text-center text-[10px] font-medium text-[#fb923c]">Medium</span>
                        <span className="text-xs text-[#525252]">≥</span>
                        <Input
                          type="number"
                          value={mediumThreshold}
                          onChange={(e) => onMediumThresholdChange(e.target.value)}
                          className="h-6 w-16 bg-[#1a1a1a] px-2 text-xs"
                          min="0"
                        />
                        <span className="text-xs text-[#525252]">points</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-16 shrink-0 rounded-full border border-[#44403c] bg-[#1c1917] px-2 py-0.5 text-center text-[10px] font-medium text-[#78716c]">Low</span>
                        <span className="text-xs text-[#525252]">{"< "}{mediumThreshold || "—"} points</span>
                      </div>
                    </div>
                    <p className="text-[10px] leading-4 text-[#525252]">
                      Assign point values to individual answer options in the field editor. The total determines priority on submission.
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="history" className="border-[#2a2a2a]">
            <AccordionTrigger className="py-4 text-sm font-semibold text-white hover:no-underline">
              <span className="inline-flex items-center gap-2"><History className="h-4 w-4" />History</span>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <div className="space-y-2">
                {versionsLoading && <p className="text-[10px] text-[#525252]">Loading versions…</p>}
                {!versionsLoading && versions.length === 0 && (
                  <p className="text-[10px] leading-4 text-[#525252]">No saved versions yet. Save one to snapshot this form.</p>
                )}
                {versions.map((v) => (
                  <div key={v.id} className={cn("rounded-md border p-3", v.current ? "border-[#474747] bg-[#202020]" : "border-[#2a2a2a] bg-[#161616]")}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{v.label}</span>
                      {v.current && <span className="rounded-full bg-[#2a2a2a] px-1.5 py-0 text-[10px] text-[#737373]">Current</span>}
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#525252]">{v.when} · {v.author}</p>
                    <p className="mt-1.5 text-[10px] leading-4 text-[#737373]">{v.notes}</p>
                    {!v.current && (
                      <button type="button" onClick={() => onRestoreVersion(v)} className="mt-2 flex items-center gap-1 text-[10px] text-[#525252] transition-colors hover:text-white">
                        <RotateCcw className="h-3 w-3" />Restore this version
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <Button type="button" variant="outline" className="w-full text-xs" onClick={onOpenSaveDialog}>
                  <History className="h-3.5 w-3.5" />Save current version
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </aside>
  );
}

function FormBuilderEditor({ slug, initialDoc }) {
  const settings0 = initialDoc.settings;
  const initialFields = useMemo(() => hydrateFields(initialDoc.fieldDefs), [initialDoc]);

  const [title, setTitle] = useState(initialDoc.title);
  const [description, setDescription] = useState(initialDoc.description || "");
  const [fields, setFieldsRaw] = useState(initialFields);
  const fieldsRef = useRef(initialFields);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  useEffect(() => { fieldsRef.current = fields; }, [fields]);

  const setFields = (updater) => {
    const current = fieldsRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    setPast((p) => [...p.slice(-50), current]);
    setFuture([]);
    setFieldsRaw(next);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [fieldsRef.current, ...f]);
    setFieldsRaw(prev);
    fieldsRef.current = prev;
    setPast((p) => p.slice(0, -1));
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, fieldsRef.current]);
    setFieldsRaw(next);
    fieldsRef.current = next;
    setFuture((f) => f.slice(1));
  };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const [coverStyle, setCoverStyle] = useState(settings0.coverStyle);
  const [showIcon, setShowIcon] = useState(settings0.showIcon);
  const [branding, setBranding] = useState(settings0.branding);
  const [submitAnother, setSubmitAnother] = useState(settings0.submitAnother);
  const [canvasWidth, setCanvasWidth] = useState(760);

  const [steps, setSteps] = useState(settings0.steps || []);
  const [openDate, setOpenDate] = useState(settings0.openDate);
  const [closeDate, setCloseDate] = useState(settings0.closeDate);
  const [responseLimit, setResponseLimit] = useState(settings0.responseLimit);
  const [thankYouType, setThankYouType] = useState(settings0.thankYouType);
  const [thankYouText, setThankYouText] = useState(settings0.thankYouText);
  const [thankYouUrl, setThankYouUrl] = useState(settings0.thankYouUrl);

  const { versions, loading: versionsLoading, save: saveVersionRow } = useVersions(initialDoc.id);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveNotes, setSaveNotes] = useState("");

  const [scoringEnabled, setScoringEnabled] = useState(settings0.scoringEnabled);
  const [highThreshold, setHighThreshold] = useState(settings0.highThreshold);
  const [mediumThreshold, setMediumThreshold] = useState(settings0.mediumThreshold);

  const [branchingEnabled, setBranchingEnabled] = useState(Boolean(settings0.branchingEnabled));
  const [branches, setBranches] = useState(Array.isArray(settings0.branches) ? settings0.branches : []);

  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const addBranch = () => setBranches((cur) => [...cur, { id: `br-${Date.now()}`, name: `Path ${cur.length + 1}`, condition: "", outcome: "" }]);
  const updateBranch = (id, patch) => setBranches((cur) => cur.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBranch = (id) => setBranches((cur) => cur.filter((b) => b.id !== id));

  const reorderField = (fromId, toId) => {
    setFields((cur) => {
      const arr = [...cur];
      const fi = arr.findIndex((f) => f.id === fromId);
      if (fi === -1) return cur;
      if (toId === "__end__") {
        const [item] = arr.splice(fi, 1);
        arr.push(item);
        return arr;
      }
      const ti = arr.findIndex((f) => f.id === toId);
      if (ti === -1 || fi === ti) return cur;
      const [item] = arr.splice(fi, 1);
      arr.splice(ti, 0, item);
      return arr;
    });
  };

  const includedFields = useMemo(() => fields.filter((f) => f.included), [fields]);

  const canvasBottomRef = useRef(null);
  const prevIncludedLengthRef = useRef(includedFields.length);
  useEffect(() => {
    if (includedFields.length > prevIncludedLengthRef.current) {
      canvasBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prevIncludedLengthRef.current = includedFields.length;
  }, [includedFields.length]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [past, future]);

  const updateField = (id, patch) => setFields((cur) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const toggleField = (id) => setFields((cur) => cur.map((f) => (f.id === id ? { ...f, included: !f.included } : f)));

  const addField = () => {
    const idx = fields.filter((f) => f.type !== "calculated").length + 1;
    setFields((cur) => [...cur, { id: `field-${Date.now()}`, title: `Field ${idx}`, Icon: AlignLeft, included: true, type: "text", firstLabel: "Field label", firstValue: `Field ${idx}`, secondLabel: "Placeholder", secondValue: "Enter value…", info: false, required: false, conditions: [] }]);
  };

  const addCalculated = () => {
    const idx = fields.filter((f) => f.type === "calculated").length + 1;
    setFields((cur) => [...cur, { id: `calc-${Date.now()}`, title: `Calculated Field ${idx}`, Icon: FunctionSquare, included: true, type: "calculated", formula: "", info: false, required: false, conditions: [] }]);
  };

  const addStep = () => setSteps((cur) => [...cur, { id: `step-${Date.now()}`, title: `Step ${cur.length + 1}` }]);
  const updateStep = (id, title) => setSteps((cur) => cur.map((s) => (s.id === id ? { ...s, title } : s)));
  const removeStep = (id) => setSteps((cur) => cur.filter((s) => s.id !== id));

  const saveVersion = async (notes) => {
    const doc = JSON.parse(docSignature);
    await saveVersionRow({ notes: notes.trim() || "Manual version save", schema: doc.schema, settings: doc.settings });
    setSaveNotes("");
    setSaveDialogOpen(false);
  };

  const restoreVersion = async (v) => {
    await saveFormBySlug(slug, { schema: v.schema, settings: v.settings });
    if (typeof window !== "undefined") window.location.reload();
  };

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = canvasWidth;
    const move = (me) => setCanvasWidth(Math.min(760, Math.max(420, startW + (me.clientX - startX) * 2)));
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const stepsPerField = steps.length > 0 ? Math.ceil(includedFields.length / (steps.length + 1)) : null;

  const settingsBag = {
    coverStyle, showIcon, branding, submitAnother, steps, openDate, closeDate, responseLimit,
    thankYouType, thankYouText, thankYouUrl,
    scoringEnabled, highThreshold, mediumThreshold,
    branchingEnabled, branches,
  };
  const docSignature = JSON.stringify(serializeBuilderDoc({ title, description, fields, settings: settingsBag }));
  const [saveState, setSaveState] = useState("saved");
  const firstSaveRef = useRef(true);

  useEffect(() => {
    if (firstSaveRef.current) {
      firstSaveRef.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(() => {
      saveFormBySlug(slug, JSON.parse(docSignature))
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [docSignature, slug]);

  return (
    <div className="flex h-full min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#121212] text-white">
      <div className="flex min-h-0 flex-1">
        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto bg-[#121212]">
          <div className="flex items-center gap-1.5 border-b border-[#2a2a2a] px-4 py-2.5">
            <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="flex h-8 w-8 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#242424] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <Undo2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="flex h-8 w-8 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#242424] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <Redo2 className="h-4 w-4" />
            </button>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className={cn(
                "flex items-center gap-1.5",
                saveState === "error" ? "text-[#f87171]" : "text-[#a3a3a3]",
              )}>
                {saveState === "saving" ? (
                  <RotateCcw className="h-3.5 w-3.5 animate-spin text-[#737373]" />
                ) : saveState === "error" ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <CheckIcon className="h-3.5 w-3.5 text-[#737373]" />
                )}
                <p className="text-neutral-400 font-sans antialiased">
                {saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}</p>
              </span>
            </div>
          </div>
          <section className="relative min-h-full">
            {coverStyle === "cover" && (
              <div className="relative h-[164px] border-b border-[#2a2a2a] bg-[linear-gradient(106deg,#17353a_0%,#3e3a24_48%,#5a2d29_100%)]">
                <Button type="button" variant="outline" size="sm" className="absolute right-4 top-3 bg-[#1a1a1a]">Change Cover</Button>
              </div>
            )}

            <div className={cn("mx-auto w-full px-0 pb-8", coverStyle === "cover" ? "-mt-[66px]" : "mt-6")} style={{ maxWidth: `${canvasWidth}px` }}>
              <div className="relative">
                <FormIntroCard title={title} description={description} onTitleChange={setTitle} onDescriptionChange={setDescription} />
                <ResizeHandle label="Resize form width" onMouseDown={startResize} />
              </div>

              <div className="mt-5 space-y-4">
                {includedFields.map((field, idx) => {
                  const showIndicator = dragId && dragId !== field.id && dragOverId === field.id;
                  return (
                    <div key={field.id} className="relative">
                      {showIndicator && (
                        <div className="pointer-events-none absolute -top-2.5 inset-x-0 z-30 flex items-center gap-0">
                          <div className="h-2 w-2 rounded-full bg-[#4a9eff]" />
                          <div className="h-px flex-1 bg-[#4a9eff]" />
                        </div>
                      )}
                      {steps.length > 0 && stepsPerField && idx > 0 && idx % stepsPerField === 0 && (
                        <div className="mb-4">
                          <StepDivider
                            step={steps[Math.floor(idx / stepsPerField) - 1] ?? steps[steps.length - 1]}
                            onTitleChange={(t) => updateStep((steps[Math.floor(idx / stepsPerField) - 1] ?? steps[steps.length - 1]).id, t)}
                            onRemove={() => removeStep((steps[Math.floor(idx / stepsPerField) - 1] ?? steps[steps.length - 1]).id)}
                          />
                        </div>
                      )}
                      <div className="relative">
                        <FieldCard
                          field={field}
                          allFields={includedFields}
                          onChange={(patch) => updateField(field.id, patch)}
                          onRemove={() => updateField(field.id, { included: false })}
                          dragging={dragId === field.id}
                          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragId(field.id); }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(field.id); }}
                          onDrop={(e) => { e.preventDefault(); if (dragId) reorderField(dragId, field.id); setDragId(null); setDragOverId(null); }}
                          onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                        />
                        <ResizeHandle label={`Resize ${field.title}`} onMouseDown={startResize} />
                      </div>
                    </div>
                  );
                })}
                {dragId && (
                  <div
                    className="relative h-8"
                    onDragOver={(e) => { e.preventDefault(); setDragOverId("__end__"); }}
                    onDrop={(e) => { e.preventDefault(); if (dragId) reorderField(dragId, "__end__"); setDragId(null); setDragOverId(null); }}
                  >
                    {dragOverId === "__end__" && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-0">
                        <div className="h-2 w-2 rounded-full bg-[#4a9eff]" />
                        <div className="h-px flex-1 bg-[#4a9eff]" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div ref={canvasBottomRef} className="mt-6 flex justify-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={addField} className="gap-1.5 bg-[#1a1a1a]"><Plus className="h-3.5 w-3.5" />Add field</Button>
                <Button type="button" variant="outline" size="sm" onClick={addCalculated} className="gap-1.5 bg-[#1a1a1a]"><FunctionSquare className="h-3.5 w-3.5" />Calculated</Button>
                <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1.5 bg-[#1a1a1a]"><SplitSquareVertical className="h-3.5 w-3.5" />Add step</Button>
              </div>
            </div>
          </section>
        </main>

        <RightSidebar
          fields={fields} onToggleField={toggleField} onAddField={addField} onAddCalculated={addCalculated}
          coverStyle={coverStyle} onCoverStyleChange={setCoverStyle} showIcon={showIcon} onShowIconChange={setShowIcon}
          branding={branding} onBrandingChange={setBranding} submitAnother={submitAnother} onSubmitAnotherChange={setSubmitAnother}
          openDate={openDate} closeDate={closeDate} onOpenDateChange={setOpenDate} onCloseDateChange={setCloseDate}
          steps={steps} onAddStep={addStep} onUpdateStep={updateStep} onRemoveStep={removeStep}
          responseLimit={responseLimit} onResponseLimitChange={setResponseLimit}
          thankYouType={thankYouType} thankYouText={thankYouText} thankYouUrl={thankYouUrl}
          onThankYouTypeChange={setThankYouType} onThankYouTextChange={setThankYouText} onThankYouUrlChange={setThankYouUrl}
          versions={versions} versionsLoading={versionsLoading} onRestoreVersion={restoreVersion} onOpenSaveDialog={() => setSaveDialogOpen(true)}
          scoringEnabled={scoringEnabled} onScoringEnabledChange={setScoringEnabled}
          highThreshold={highThreshold} onHighThresholdChange={setHighThreshold}
          mediumThreshold={mediumThreshold} onMediumThresholdChange={setMediumThreshold}
          branchingEnabled={branchingEnabled} onBranchingEnabledChange={setBranchingEnabled}
          branches={branches} onAddBranch={addBranch} onUpdateBranch={updateBranch} onRemoveBranch={removeBranch}
        />
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save version</DialogTitle>
            <DialogDescription>Snapshot the current state of this form. You can restore any saved version from the History panel.</DialogDescription>
          </DialogHeader>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#a3a3a3]">Change notes <span className="text-[#525252]">(optional)</span></label>
            <Textarea
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              rows={3}
              placeholder="Describe what changed in this version..."
              className="resize-none text-[#d4d4d4]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => saveVersion(saveNotes)}>Save version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export function FormBuilder({ formId }) {
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDoc(null);
    setError(false);
    getFormBySlug(formId)
      .then((form) => {
        if (active) setDoc(form || blankFormDoc(formId));
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [formId]);

  if (error) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-2 bg-[#121212] text-center text-sm text-[#a3a3a3]">
        <p className="font-medium text-[#e7e7e7]">Couldn&apos;t load this form</p>
        <p className="max-w-sm text-xs text-[#737373]">
          This form couldn&apos;t be loaded right now. Refresh the page or try again shortly.
        </p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-full min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-[#121212]">
        <RotateCcw className="h-5 w-5 animate-spin text-[#737373]" />
      </div>
    );
  }

  return <FormBuilderEditor key={formId} slug={formId} initialDoc={doc} />;
}
