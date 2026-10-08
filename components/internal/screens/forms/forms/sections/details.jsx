"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@geiger/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Field, SectionCard } from "@geiger/ui/screen-kit";
import { cn } from "@/lib/utils";
import { FIELD_CLS, OUTLINE_BTN, TextArea, TextInput } from "./kit";

// Name, description, category and tags (saved via updateForm, not settings).
export function DetailsSection({ draft, setDetails, categories = [] }) {
  const [tagInput, setTagInput] = useState("");
  const tags = draft.tags || [];
  const options = draft.category && !categories.includes(draft.category) ? [...categories, draft.category] : categories;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setDetails({ tags: [...tags, t] });
    setTagInput("");
  };

  return (
    <SectionCard title="Form details" description="How this form is named and organised in the workspace.">
      <div className="grid gap-4">
        <Field label="Form name" htmlFor="form-name">
          <TextInput id="form-name" value={draft.title} onChange={(v) => setDetails({ title: v })} placeholder="e.g. Partner application" />
        </Field>
        <Field label="Description" hint="Shown under the form title and in the template gallery.">
          <TextArea value={draft.description} onChange={(v) => setDetails({ description: v })} rows={3} placeholder="What is this form for?" />
        </Field>
        <Field label="Folder / category">
          <Select value={draft.category || "none"} onValueChange={(v) => setDetails({ category: v === "none" ? null : v })}>
            <SelectTrigger className={cn("h-9", FIELD_CLS)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No folder</SelectItem>
              {options.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tags">
          {tags.length ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-md border border-border bg-surface-card px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  #{t}
                  <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove tag ${t}`} onClick={() => setDetails({ tags: tags.filter((x) => x !== t) })} className="size-4 text-text-tertiary hover:bg-transparent hover:text-foreground">
                    <X className="size-2.5" />
                  </Button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <TextInput
              value={tagInput}
              onChange={setTagInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter…"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addTag} className={cn("h-9 shrink-0 px-3", OUTLINE_BTN)}>
              Add
            </Button>
          </div>
        </Field>
      </div>
    </SectionCard>
  );
}
