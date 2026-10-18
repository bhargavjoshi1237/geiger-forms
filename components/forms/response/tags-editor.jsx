"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";

// Tag chips with inline remove and an add popover (suggests known tags).
export function TagsEditor({ tags = [], suggestions = [], onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const add = (value) => {
    const tag = String(value || "").trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setDraft("");
    setOpen(false);
  };

  const remove = (tag) => onChange(tags.filter((t) => t !== tag));
  const options = suggestions.filter((s) => !tags.includes(s) && s.toLowerCase().includes(draft.trim().toLowerCase())).slice(0, 8);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-card py-0.5 pl-2 pr-0.5 text-xs text-muted-foreground">
          {tag}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => remove(tag)}
            disabled={disabled}
            className="size-5 rounded text-text-tertiary hover:bg-surface-hover hover:text-foreground"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={disabled}
            className="h-auto gap-1 border-dashed bg-transparent px-2 py-1 text-xs font-normal text-text-secondary shadow-none hover:border-border-strong hover:bg-transparent hover:text-foreground has-[>svg]:px-2"
          >
            <Plus className="h-3.5 w-3.5" /> Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 border-border bg-surface-subtle p-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder="Add a tag…"
            className="px-2.5 py-[7px] text-sm md:text-sm"
          />
          {options.length ? (
            <div className="mt-1 flex flex-col">
              {options.map((s) => (
                <Button key={s} type="button" variant="ghost" size="sm" onClick={() => add(s)} className="h-auto justify-start rounded-sm px-2 py-1.5 text-sm font-normal text-foreground hover:bg-surface-active hover:text-foreground">
                  {s}
                </Button>
              ))}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
