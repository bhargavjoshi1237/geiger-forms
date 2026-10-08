"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, Kanban, Loader2, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { cn } from "@/lib/utils";
import { createSavedView, deleteSavedView, listSavedViews } from "@/lib/supabase/saved_views";
import { OUTLINE_BUTTON } from "./constants";

const CHIP = "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors";

// Saved filter/sort/layout presets for a project (inbox) or one form.
export function SavedViewsBar({ projectId, formId, activeId, current, onApply, onReset }) {
  const [views, setViews] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    listSavedViews({ projectId: projectId || undefined, formId: formId || undefined })
      .then((rows) => live && setViews(rows))
      .catch(() => live && setViews([]));
    return () => {
      live = false;
    };
  }, [projectId, formId]);

  const save = async () => {
    const label = name.trim();
    if (!label) return;
    setSaving(true);
    const id = crypto.randomUUID();
    const optimistic = { id, name: label, layout: current.layout, filters: { ...current.filters, sort: current.sort } };
    setViews((cur) => [...cur, optimistic]);
    try {
      const created = await createSavedView({ id, projectId: projectId || null, formId: formId || null, name: label, layout: current.layout, filters: optimistic.filters });
      setViews((cur) => cur.map((v) => (v.id === id ? created : v)));
      onApply(created);
      toast.success(`Saved view “${label}”`);
      setName("");
      setOpen(false);
    } catch {
      setViews((cur) => cur.filter((v) => v.id !== id));
      toast.error("Couldn't save this view.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (view) => {
    const before = views;
    setViews((cur) => cur.filter((v) => v.id !== view.id));
    if (activeId === view.id) onReset();
    try {
      await deleteSavedView(view.id);
      toast.success(`Deleted view “${view.name}”`);
    } catch {
      setViews(before);
      toast.error("Couldn't delete this view.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="scrollbar-subtle flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          className={cn(CHIP, !activeId ? "border-border-strong bg-surface-hover text-foreground" : "border-border text-text-secondary hover:bg-surface-card hover:text-foreground")}
        >
          All responses
        </Button>
        {views.map((view) => {
          const Icon = view.layout === "kanban" ? Kanban : Table2;
          const active = activeId === view.id;
          return (
            <span
              key={view.id}
              className={cn(CHIP, "pr-1", active ? "border-border-strong bg-surface-hover text-foreground" : "border-border text-text-secondary hover:bg-surface-card hover:text-foreground")}
            >
              <Button type="button" variant="ghost" onClick={() => onApply(view)} className="h-auto gap-1.5 p-0 text-xs font-medium text-inherit hover:bg-transparent hover:text-inherit">
                <Icon className="size-3.5" />
                {view.name}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => remove(view)}
                className="size-4 rounded text-text-tertiary opacity-0 transition-opacity hover:bg-surface-active hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                aria-label={`Delete view ${view.name}`}
              >
                <X className="size-3" />
              </Button>
            </span>
          );
        })}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className={cn("h-8 shrink-0 gap-1.5 text-xs", OUTLINE_BUTTON)}>
            <BookmarkPlus className="h-3.5 w-3.5" /> Save view
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 border-border bg-surface-subtle p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Bookmark className="h-3.5 w-3.5" /> Save current view</p>
          <p className="mt-0.5 text-[11px] text-text-tertiary">Keeps filters, sort and the {current.layout} layout.</p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. High priority, unassigned"
            className="mt-2 h-8 text-xs"
          />
          <Button type="button" size="sm" className="mt-2 h-8 w-full bg-primary text-xs text-primary-foreground hover:bg-primary/90" onClick={save} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save view
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
