"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, ChevronDown, Kanban, Loader2, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@geiger/ui/tooltip";
import { cn } from "@/lib/utils";
import { createSavedView, deleteSavedView, listSavedViews } from "@/lib/supabase/saved_views";

const ITEM = "cursor-pointer gap-2 text-xs focus:bg-surface-hover focus:text-foreground";

// Saved filter/sort/layout presets for a project (inbox) or one form; shared by the views dropdown and the save button.
export function useSavedViews({ projectId, formId, activeId, onApply, onReset }) {
  const [views, setViews] = useState([]);

  useEffect(() => {
    let live = true;
    listSavedViews({ projectId: projectId || undefined, formId: formId || undefined })
      .then((rows) => live && setViews(rows))
      .catch(() => live && setViews([]));
    return () => {
      live = false;
    };
  }, [projectId, formId]);

  const save = async (label, current) => {
    const id = crypto.randomUUID();
    const optimistic = { id, name: label, layout: current.layout, filters: { ...current.filters, sort: current.sort } };
    setViews((cur) => [...cur, optimistic]);
    try {
      const created = await createSavedView({ id, projectId: projectId || null, formId: formId || null, name: label, layout: current.layout, filters: optimistic.filters });
      setViews((cur) => cur.map((v) => (v.id === id ? created : v)));
      onApply(created);
      toast.success(`Saved filters & layout as “${label}”`);
      return true;
    } catch {
      setViews((cur) => cur.filter((v) => v.id !== id));
      toast.error("Couldn't save these filters.");
      return false;
    }
  };

  const remove = async (view) => {
    const before = views;
    setViews((cur) => cur.filter((v) => v.id !== view.id));
    if (activeId === view.id) onReset();
    try {
      await deleteSavedView(view.id);
      toast.success(`Deleted “${view.name}”`);
    } catch {
      setViews(before);
      toast.error("Couldn't delete these saved filters.");
    }
  };

  return { views, save, remove };
}

// Toolbar dropdown to switch between "All responses" and saved views; hidden until at least one exists.
export function SavedViewsDropdown({ views, activeId, onApply, onReset, onRemove }) {
  if (!views.length) return null;
  const active = views.find((v) => v.id === activeId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 max-w-56 gap-1.5 rounded-md border-border bg-surface-card px-3 text-xs font-medium text-foreground hover:bg-surface-subtle">
          <Bookmark className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          <span className="truncate">{active?.name || "All responses"}</span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-text-secondary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 border-border bg-surface-subtle text-foreground">
        <DropdownMenuRadioGroup
          value={active ? active.id : "all"}
          onValueChange={(id) => (id === "all" ? onReset() : onApply(views.find((v) => v.id === id)))}
        >
          <DropdownMenuRadioItem value="all" className={ITEM}>All responses</DropdownMenuRadioItem>
          <DropdownMenuSeparator className="bg-border" />
          {views.map((view) => {
            const Icon = view.layout === "kanban" ? Kanban : Table2;
            return (
              <DropdownMenuRadioItem key={view.id} value={view.id} className={cn(ITEM, "group pr-1")}>
                <Icon className="h-3.5 w-3.5 text-text-secondary" />
                <span className="min-w-0 flex-1 truncate">{view.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  // Stop the click reaching the item so deleting doesn't also apply the view.
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(view);
                  }}
                  className="size-6 rounded text-text-tertiary opacity-0 hover:bg-surface-active hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 group-focus:opacity-100"
                  aria-label={`Delete saved filters ${view.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Icon-only toolbar button that saves the current filters, sort and layout under a name.
export function SaveViewButton({ layout, onSave }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const label = name.trim();
    if (!label || saving) return;
    setSaving(true);
    const ok = await onSave(label);
    setSaving(false);
    if (ok) {
      setName("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Save filters & layout"
              className="shrink-0 border-border bg-surface-card text-text-secondary hover:bg-surface-subtle hover:text-foreground"
            >
              <BookmarkPlus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Save filters & layout</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-72 border-border bg-surface-subtle p-4">
        <p className="text-sm font-medium text-foreground">Save filters & layout</p>
        <p className="mt-1 text-xs text-text-tertiary">Keeps the current filters, sort and {layout} layout as a saved view.</p>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. High priority, unassigned"
          aria-label="Name"
          className="mt-3"
        />
        <Button type="button" className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit} disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}
