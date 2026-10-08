"use client";

import { useState } from "react";
import {
  ChevronDown,
  CircleDot,
  Download,
  FileJson,
  FileText,
  Loader2,
  Printer,
  Tag,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";
import { StatusPill } from "@geiger/ui/screen-kit";
import {
  MENU_ITEM,
  OUTLINE_BUTTON,
  RESPONSE_PRIORITIES,
  RESPONSE_PRIORITY_MAP,
  RESPONSE_STATUSES,
  RESPONSE_STATUS_MAP,
} from "./constants";

const BAR_BUTTON = `h-8 gap-1.5 px-2.5 text-xs ${OUTLINE_BUTTON}`;

// Spreads trigger props (React 19 passes ref as a prop) so it works under asChild.
function MenuButton({ icon: Icon, label, ...props }) {
  return (
    <Button type="button" variant="outline" size="sm" className={BAR_BUTTON} {...props}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ChevronDown className="h-3 w-3" />
    </Button>
  );
}

// Input popover with primary/secondary actions (tag add/remove, assign/unassign).
function InputPopover({ icon, label, placeholder, suggestions, primary, secondary }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const run = (fn, needsValue = true) => {
    const v = value.trim();
    if (needsValue && !v) return;
    fn(v);
    setValue("");
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <MenuButton icon={icon} label={label} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 border-border bg-surface-subtle p-2">
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(primary.run)}
          placeholder={placeholder}
          list={`bulk-${label}-options`}
          className="h-8 text-xs"
        />
        <datalist id={`bulk-${label}-options`}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
        <div className="mt-2 flex gap-1.5">
          <Button type="button" size="sm" className="h-7 flex-1 bg-primary text-xs text-primary-foreground hover:bg-primary/90" onClick={() => run(primary.run)}>
            {primary.label}
          </Button>
          {secondary ? (
            <Button type="button" size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={() => run(secondary.run, secondary.needsValue !== false)}>
              {secondary.label}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Actions over the selected rows.
export function BulkBar({
  count,
  totalFiltered,
  busy,
  canExport,
  canDelete,
  tagSuggestions,
  assigneeSuggestions,
  onSelectAll,
  onClear,
  onUpdate,
  onTag,
  onExport,
  onPrint,
  onDelete,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-strong bg-surface-card px-3 py-2 shadow-sm">
      <span className="flex items-center gap-2 pr-1 text-xs font-medium text-foreground">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {count} selected
      </span>
      {count < totalFiltered ? (
        <Button type="button" variant="link" onClick={onSelectAll} className="h-auto p-0 text-xs font-normal text-sky-400">
          Select all {totalFiltered}
        </Button>
      ) : null}
      <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild><MenuButton icon={CircleDot} label="Status" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 border-border bg-surface-subtle">
          {RESPONSE_STATUSES.map((s) => (
            <DropdownMenuItem key={s} className={MENU_ITEM} onClick={() => onUpdate({ status: s }, `Marked ${s}`)}>
              <StatusPill status={s} map={RESPONSE_STATUS_MAP} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild><MenuButton icon={Zap} label="Priority" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 border-border bg-surface-subtle">
          {RESPONSE_PRIORITIES.map((p) => (
            <DropdownMenuItem key={p} className={MENU_ITEM} onClick={() => onUpdate({ priority: p }, `Priority set to ${p}`)}>
              <StatusPill status={p} map={RESPONSE_PRIORITY_MAP} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <InputPopover
        icon={Tag}
        label="Tags"
        placeholder="Tag name"
        suggestions={tagSuggestions}
        primary={{ label: "Add tag", run: (v) => onTag({ add: [v] }) }}
        secondary={{ label: "Remove tag", run: (v) => onTag({ remove: [v] }) }}
      />

      <InputPopover
        icon={UserPlus}
        label="Assign"
        placeholder="Name or email"
        suggestions={assigneeSuggestions}
        primary={{ label: "Assign", run: (v) => onUpdate({ assignee: v }, `Assigned to ${v}`) }}
        secondary={{ label: "Unassign", needsValue: false, run: () => onUpdate({ assignee: "" }, "Unassigned") }}
      />

      {canExport ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><MenuButton icon={Download} label="Export" /></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 border-border bg-surface-subtle">
            <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">Selected responses</DropdownMenuLabel>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => onExport("csv")}><FileText className="h-4 w-4" /> CSV (Excel-ready)</DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM} onClick={() => onExport("json")}><FileJson className="h-4 w-4" /> JSON</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className={MENU_ITEM} onClick={onPrint}><Printer className="h-4 w-4" /> Print / PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {canDelete ? (
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 border-red-500/20 bg-red-500/10 px-2.5 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      ) : null}

      <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8 text-text-secondary" onClick={onClear} aria-label="Clear selection">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
