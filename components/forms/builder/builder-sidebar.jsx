"use client";

import { memo, useMemo } from "react";
import { Clock, Eye, EyeOff, FolderOpen, GitBranch, History, LayoutGrid, Plus, SlidersHorizontal, SplitSquareVertical, Target, Wand2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@geiger/ui/accordion";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { splitPages } from "@/lib/forms/logic";
import { FieldTypeIcon, SubtleNote } from "./builder-controls";
import { FieldPalette } from "./field-palette";
import { HistorySection } from "./history-section";
import { BranchesSection, ScheduleSection, StyleSection, SubmissionSection, TriageSection } from "./sidebar-sections";

function SectionTitle({ icon: Icon, children, count, dot }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {children}
      {count ? <Badge className="rounded-full px-1.5 py-0 text-[10px]">{count}</Badge> : null}
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
    </span>
  );
}

function FieldRowItem({ field, selected, onSelect, onToggle }) {
  return (
    <div className={cn("group/item flex h-8 items-center gap-2 rounded-md px-1.5 text-sm transition-colors", selected ? "bg-surface-active text-foreground" : "text-muted-foreground hover:bg-surface-hover")}>
      <Button type="button" variant="ghost" onClick={() => onSelect(field.id)} className="h-auto min-w-0 flex-1 justify-start gap-2 p-0 text-left font-normal text-inherit hover:bg-transparent hover:text-inherit has-[>svg]:px-0">
        <FieldTypeIcon type={field.type} className="size-3.5 shrink-0 text-text-secondary" />
        <span className={cn("min-w-0 flex-1 truncate", field.included === false && "text-text-tertiary line-through")}>{field.title}</span>
      </Button>
      {field.type === "calculated" ? <Badge variant="info" className="px-1 py-0 text-[9px]">Calc</Badge> : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={field.included === false ? `Include ${field.title}` : `Exclude ${field.title}`}
        title={field.included === false ? "Include in form" : "Exclude from form"}
        onClick={() => onToggle(field.id)}
        className="text-text-tertiary hover:text-foreground"
      >
        {field.included === false ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

const FieldsSection = memo(function FieldsSection({ fields, selectedId, onSelect, onToggle }) {
  const list = fields.filter((f) => f.type !== "page");
  const excluded = list.filter((f) => f.included === false);
  const included = list.filter((f) => f.included !== false);
  return (
    <div className="space-y-3">
      {included.length === 0 ? <SubtleNote>No fields yet.</SubtleNote> : null}
      <div className="space-y-0.5">
        {included.map((f) => <FieldRowItem key={f.id} field={f} selected={selectedId === f.id} onSelect={onSelect} onToggle={onToggle} />)}
      </div>
      {excluded.length ? (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary"><EyeOff className="h-3 w-3" />Excluded · {excluded.length}</p>
          <div className="space-y-0.5">
            {excluded.map((f) => <FieldRowItem key={f.id} field={f} selected={selectedId === f.id} onSelect={onSelect} onToggle={onToggle} />)}
          </div>
          <SubtleNote>Excluded fields stay in the editor but aren&apos;t shown to respondents.</SubtleNote>
        </div>
      ) : null}
    </div>
  );
});

const PagesSection = memo(function PagesSection({ fields, selectedId, onSelect, onAddPage }) {
  const pages = useMemo(() => splitPages(fields, "Page 1"), [fields]);
  return (
    <div className="space-y-2">
      {pages.map((p, i) => (
        <Button
          key={p.id}
          type="button"
          variant="ghost"
          onClick={() => p.break && onSelect(p.break.id)}
          disabled={!p.break}
          className={cn(
            "h-auto w-full justify-start gap-2 rounded-md border px-2.5 py-1.5 text-left font-normal transition-colors disabled:opacity-100",
            p.break && selectedId === p.break.id ? "border-border-strong bg-surface-card hover:bg-surface-card" : "border-border bg-background hover:bg-background",
            p.break && "hover:border-border-strong",
          )}
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface-hover text-[10px] font-semibold text-text-secondary">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{p.title || `Page ${i + 1}`}</span>
          {p.break?.conditions?.length ? <GitBranch className="h-3 w-3 shrink-0 text-text-tertiary" /> : null}
          <span className="shrink-0 text-[10px] text-text-tertiary">{p.fields.length} field{p.fields.length === 1 ? "" : "s"}</span>
        </Button>
      ))}
      <Button type="button" variant="outline" className="h-8 w-full text-xs" onClick={onAddPage}><Plus className="h-3.5 w-3.5" />Add page</Button>
      {pages.length === 1 ? <SubtleNote>Add a page break to split the form into steps. Each break can skip its page with conditions.</SubtleNote> : null}
    </div>
  );
});

const trigger = "py-3.5 text-sm font-semibold text-foreground hover:no-underline";

// Right-hand builder sidebar: insert palette, field list, pages and the light-weight form sections.
export function BuilderSidebar({
  doc,
  selectedId,
  sources,
  onInsert,
  onSelect,
  onToggleIncluded,
  onSettingsChange,
  history,
}) {
  const { fields, settings } = doc;
  const scheduleActive = Boolean(settings.openDate || settings.closeDate || settings.responseLimit);
  const pageCount = fields.filter((f) => f.type === "page" && f.included !== false).length;

  return (
    <aside className="hidden w-[304px] shrink-0 flex-col border-l border-border bg-surface-subtle lg:flex">
      <div className="scrollbar-subtle flex-1 overflow-y-auto px-4 py-2">
        <Accordion type="multiple" defaultValue={["add", "fields"]}>
          <AccordionItem value="add" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={LayoutGrid}>Add fields</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4">
              <FieldPalette onPick={(type) => onInsert(type, { afterId: selectedId })} />
              <SubtleNote className="mt-2">Click to insert after the selected field, or drag onto the canvas.</SubtleNote>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fields" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={SlidersHorizontal} count={fields.filter((f) => f.type !== "page").length}>Fields</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4">
              <FieldsSection fields={fields} selectedId={selectedId} onSelect={onSelect} onToggle={onToggleIncluded} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pages" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={SplitSquareVertical} count={pageCount ? pageCount + 1 : 0}>Pages</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4">
              <PagesSection fields={fields} selectedId={selectedId} onSelect={onSelect} onAddPage={() => onInsert("page", { afterId: selectedId })} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="branches" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={GitBranch} count={settings.branchingEnabled ? (settings.branches || []).length : 0}>Branches</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4"><BranchesSection settings={settings} sources={sources} onChange={onSettingsChange} /></AccordionContent>
          </AccordionItem>

          <AccordionItem value="scoring" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={Target} dot={settings.scoringEnabled || settings.quiz?.enabled}>Auto-triage &amp; quiz</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4"><TriageSection settings={settings} fields={fields} onChange={onSettingsChange} onSelectField={onSelect} /></AccordionContent>
          </AccordionItem>

          <AccordionItem value="style" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={Wand2}>Form style</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4"><StyleSection settings={settings} onChange={onSettingsChange} /></AccordionContent>
          </AccordionItem>

          <AccordionItem value="schedule" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={Clock} dot={scheduleActive}>Schedule &amp; limits</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4"><ScheduleSection settings={settings} onChange={onSettingsChange} /></AccordionContent>
          </AccordionItem>

          <AccordionItem value="submission" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={FolderOpen}>Submission</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4"><SubmissionSection settings={settings} onChange={onSettingsChange} /></AccordionContent>
          </AccordionItem>

          <AccordionItem value="history" className="border-border">
            <AccordionTrigger className={trigger}><SectionTitle icon={History}>History</SectionTitle></AccordionTrigger>
            <AccordionContent className="pb-4">
              <HistorySection {...history} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
