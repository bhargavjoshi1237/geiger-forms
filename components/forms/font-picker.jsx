"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { ScrollArea } from "@geiger/ui/scroll-area";
import { cn } from "@/lib/utils";
import { FONT_CATEGORIES, FONT_FAMILIES, findFont, fontStack } from "@/lib/forms/fonts";

function Option({ selected, onClick, children }) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-auto w-full justify-between rounded-sm px-2 py-1.5 text-left font-normal focus-visible:bg-surface-active",
        selected ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      {selected ? <Check className="size-3.5 shrink-0" /> : null}
    </Button>
  );
}

// Searchable picker over the curated theme fonts, grouped by category; `inheritLabel` adds an empty "inherit" choice.
export function FontPicker({ value, onChange, label, inheritLabel, compact = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findFont(value) || (inheritLabel ? null : findFont("sans"));

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FONT_CATEGORIES.map((c) => ({ ...c, fonts: FONT_FAMILIES.filter((f) => f.category === c.value && f.name.toLowerCase().includes(q)) })).filter((g) => g.fonts.length);
  }, [query]);

  const onOpenChange = (next) => {
    setOpen(next);
    if (!next) setQuery("");
  };
  const choose = (next) => {
    onChange(next);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label ? `${label}: ${selected?.name || inheritLabel}` : undefined}
          className={cn(
            "w-full justify-between bg-surface-card px-2.5 font-normal shadow-none hover:border-border-strong hover:bg-surface-card",
            compact ? "h-8 text-xs" : "h-9 text-sm",
          )}
        >
          <span className="truncate" style={selected ? { fontFamily: fontStack(selected.id) } : undefined}>
            {selected?.name || inheritLabel}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-text-secondary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-60 border-border bg-surface-subtle p-0">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              const first = groups[0]?.fonts[0];
              if (e.key === "Enter" && first) {
                e.preventDefault();
                choose(first.id);
              }
            }}
            placeholder={`Search ${FONT_FAMILIES.length} fonts…`}
            aria-label="Search fonts"
            className="!h-9 !rounded-none border-0 bg-transparent !pl-8 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-1">
            {inheritLabel && !query ? (
              <Option selected={!selected} onClick={() => choose("")}>
                {inheritLabel}
              </Option>
            ) : null}
            {groups.map((group) => (
              <div key={group.value} role="group" aria-label={group.label}>
                <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{group.label}</p>
                {group.fonts.map((font) => (
                  <Option key={font.id} selected={font.id === selected?.id} onClick={() => choose(font.id)}>
                    {font.name}
                  </Option>
                ))}
              </div>
            ))}
            {groups.length === 0 ? <p className="px-2 py-8 text-center text-sm text-text-secondary">No fonts match “{query.trim()}”.</p> : null}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
