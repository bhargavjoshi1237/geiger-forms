"use client";

import { memo, useRef } from "react";
import { ChevronDown, Copy, EyeOff, FunctionSquare, GitBranch, GripVertical, Lock, MoreHorizontal, Trash2, Trophy } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@geiger/ui/dropdown-menu";
import { Input } from "@geiger/ui/input";
import { cn } from "@/lib/utils";
import { getFieldType, isInputField } from "@/lib/forms/field-types";
import { FieldTypeIcon } from "./builder-controls";
import { FieldSettings } from "./field-settings";

function Summary({ field }) {
  const meta = getFieldType(field.type);
  if (field.type === "heading") return <p className="truncate text-sm font-medium text-muted-foreground">{field.label || "Section heading"}</p>;
  if (field.type === "content") return <p className="line-clamp-2 text-sm text-text-secondary">{field.hint || "Empty text block"}</p>;
  if (field.type === "calculated") return <p className="truncate font-mono text-xs text-sky-400">= {field.formula || "no formula yet"}</p>;
  const options = (field.options || []).filter(Boolean);
  return (
    <div className="min-w-0 space-y-1">
      {field.label && field.label !== field.title ? <p className="truncate text-sm text-muted-foreground">{field.label}</p> : null}
      <p className="truncate text-xs text-text-tertiary">
        {meta.label}
        {options.length ? ` · ${options.slice(0, 4).join(", ")}${options.length > 4 ? ` +${options.length - 4}` : ""}` : ""}
        {field.placeholder ? ` · “${field.placeholder}”` : ""}
      </p>
    </div>
  );
}

// One field on the canvas: compact summary, expanding to its settings when selected.
export const FieldCard = memo(function FieldCard({
  field,
  number,
  selected,
  sources,
  allFields,
  scoring,
  quiz,
  currency,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onToggleIncluded,
  onDragHandleStart,
  onDragEnd,
  dragging,
}) {
  const cardRef = useRef(null);
  const change = (patch) => onChange(field.id, patch);
  const changeTitle = (title) => onChange(field.id, field.label === field.title && isInputField(field.type) ? { title, label: title } : { title });
  const conditions = field.conditions?.length || 0;
  const graded = quiz && field.correctAnswer != null && field.correctAnswer !== "";

  return (
    <div
      ref={cardRef}
      data-field-id={field.id}
      onClick={() => !selected && onSelect(field.id)}
      className={cn(
        "group relative rounded-xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow,opacity] duration-150",
        selected ? "border-border-strong ring-1 ring-border-strong" : "cursor-pointer border-border hover:border-border-strong",
        dragging && "opacity-30",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        draggable
        aria-label={`Drag ${field.title}`}
        onDragStart={(e) => {
          if (cardRef.current) e.dataTransfer.setDragImage(cardRef.current, 24, 24);
          onDragHandleStart(e, field.id);
        }}
        onDragEnd={onDragEnd}
        onClick={(e) => e.stopPropagation()}
        className="absolute -left-8 top-4 h-auto w-auto cursor-grab rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-transparent hover:text-muted-foreground focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-3">
        <span className="mt-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-surface-subtle text-text-secondary">
          <FieldTypeIcon type={field.type} className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {number ? <span className="shrink-0 text-xs tabular-nums text-text-tertiary">{number}.</span> : null}
            <Input
              value={field.title}
              onChange={(e) => changeTitle(e.target.value)}
              onFocus={() => onSelect(field.id)}
              aria-label="Field name"
              className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1 text-base font-semibold text-foreground shadow-none hover:border-border focus-visible:border-border"
            />
            <div className="flex shrink-0 items-center gap-1">
              {field.type === "calculated" ? <Badge variant="info"><FunctionSquare />Calc</Badge> : null}
              {conditions ? <Badge variant="outline"><GitBranch />{conditions}</Badge> : null}
              {field.sensitive ? <Badge variant="warning"><Lock />ePHI</Badge> : null}
              {graded ? <Badge variant="purple"><Trophy />Quiz</Badge> : null}
              {field.required ? <Badge>Required</Badge> : null}
              {field.width && field.width !== "full" ? <Badge variant="outline" className="capitalize">{field.width}</Badge> : null}
            </div>
          </div>
          {!selected ? <div className="mt-1 px-1"><Summary field={field} /></div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Duplicate field" title="Duplicate" onClick={() => onDuplicate(field.id)} className="text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
            <Copy className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Field actions" className="text-text-secondary">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border bg-surface-subtle">
              <DropdownMenuItem onSelect={() => onDuplicate(field.id)}><Copy />Duplicate</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleIncluded(field.id)}><EyeOff />Exclude from form</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="text-red-400 focus:bg-red-500/10" onSelect={() => onDelete(field.id)}><Trash2 />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={selected ? "Collapse field" : "Edit field"}
            aria-expanded={selected}
            onClick={() => onSelect(selected ? null : field.id)}
            className={cn("text-text-secondary", selected && "bg-surface-active text-foreground")}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", selected && "rotate-180")} />
          </Button>
        </div>
      </div>

      {selected ? (
        <div className="mt-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
          <FieldSettings
            field={field}
            onChange={change}
            sources={sources.filter((s) => s.id !== field.id)}
            allFields={allFields}
            scoring={scoring}
            quiz={quiz}
            currency={currency}
          />
        </div>
      ) : null}
    </div>
  );
});
