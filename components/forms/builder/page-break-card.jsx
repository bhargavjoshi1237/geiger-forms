"use client";

import { memo } from "react";
import { ChevronDown, GitBranch, GripVertical, SplitSquareVertical, Trash2 } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { cn } from "@/lib/utils";
import { ConditionsEditor } from "./conditions-editor";
import { SubtleNote } from "./builder-controls";

// A page break on the canvas: a divider that starts page N, with its own skip conditions.
export const PageBreakCard = memo(function PageBreakCard({ field, pageNumber, selected, sources, onSelect, onChange, onDelete, onDragHandleStart, onDragEnd, dragging }) {
  const conditions = field.conditions?.length || 0;
  return (
    <div data-field-id={field.id} className={cn("group relative py-1 transition-opacity", dragging && "opacity-30")}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        draggable
        aria-label={`Drag page ${pageNumber}`}
        onDragStart={(e) => onDragHandleStart(e, field.id)}
        onDragEnd={onDragEnd}
        className="absolute -left-8 top-2.5 h-auto w-auto cursor-grab rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-transparent hover:text-muted-foreground focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-strong" />
        <div className={cn("flex items-center gap-2 rounded-lg border bg-surface-subtle py-1 pl-2.5 pr-1", selected ? "border-border-strong" : "border-border")}>
          <SplitSquareVertical className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          <span className="shrink-0 text-xs font-medium text-text-secondary">Page {pageNumber} ·</span>
          <Input
            value={field.title}
            onChange={(e) => onChange(field.id, { title: e.target.value })}
            aria-label={`Page ${pageNumber} title`}
            placeholder="Page title"
            className="h-6 w-40 border-transparent bg-transparent px-1 text-xs font-medium text-foreground shadow-none hover:border-border focus-visible:border-border"
          />
          {conditions ? <Badge variant="outline"><GitBranch />{conditions}</Badge> : null}
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Page logic" aria-expanded={selected} onClick={() => onSelect(selected ? null : field.id)} className={cn("text-text-secondary", selected && "bg-surface-active text-foreground")}>
            <ChevronDown className={cn("transition-transform", selected && "rotate-180")} />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove page break" onClick={() => onDelete(field.id)} className="text-text-secondary hover:bg-red-500/10 hover:text-red-400">
            <Trash2 />
          </Button>
        </div>
        <div className="h-px flex-1 bg-border-strong" />
      </div>
      {selected ? (
        <div className="mx-auto mt-3 max-w-lg space-y-2">
          <ConditionsEditor
            conditions={field.conditions || []}
            logic={field.conditionLogic}
            sources={sources}
            onChange={(patch) => onChange(field.id, patch)}
            title="Show this page only when"
            emptyText="No conditions — every respondent sees this page."
          />
          <SubtleNote className="text-center">When the conditions don&apos;t match, the whole page is skipped and its answers are ignored.</SubtleNote>
        </div>
      ) : null}
    </div>
  );
});
