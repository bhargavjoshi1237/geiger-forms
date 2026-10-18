"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { SearchInput } from "@geiger/ui/screen-kit";
import { cn } from "@/lib/utils";
import { Button } from "@geiger/ui/button";
import { FIELD_GROUPS, FIELD_TYPE_LIST } from "@/lib/forms/field-types";
import { FieldTypeIcon } from "./builder-controls";

export const PALETTE_MIME = "application/x-geiger-field-type";

// Searchable, grouped field-type palette; click inserts, drag drops onto the canvas.
export const FieldPalette = memo(function FieldPalette({ onPick, autoFocus = false, className, columns = 2 }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FIELD_GROUPS.map((group) => ({
      group,
      items: FIELD_TYPE_LIST.filter((t) => t.group === group && (!q || t.label.toLowerCase().includes(q) || t.type.includes(q) || group.toLowerCase().includes(q))),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  // The shared SearchInput doesn't autofocus when always expanded, so focus its input here.
  useEffect(() => {
    if (autoFocus) searchRef.current?.querySelector("input")?.focus();
  }, [autoFocus]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Enter picks the first match; the key event bubbles up from the shared input. */}
      <div
        ref={searchRef}
        onKeyDown={(e) => {
          if (e.key === "Enter" && groups[0]?.items[0]) {
            e.preventDefault();
            onPick(groups[0].items[0].type);
          }
        }}
      >
        <SearchInput value={query} onChange={setQuery} placeholder="Search field types…" aria-label="Search field types" expanded />
      </div>
      {groups.length === 0 ? <p className="py-4 text-center text-xs text-text-tertiary">No field types match “{query}”.</p> : null}
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{group}</p>
          <div className={cn("grid gap-1", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
            {items.map((t) => (
              <Button
                key={t.type}
                type="button"
                variant="ghost"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(PALETTE_MIME, t.type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onPick(t.type)}
                title={`Add ${t.label}`}
                className="h-8 min-w-0 cursor-grab justify-start gap-2 rounded-md border border-transparent px-2 text-left text-xs font-normal text-muted-foreground transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground active:cursor-grabbing has-[>svg]:px-2"
              >
                <FieldTypeIcon type={t.type} className="size-3.5 shrink-0 text-text-secondary" />
                <span className="truncate">{t.label}</span>
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
