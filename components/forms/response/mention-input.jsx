"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./members";

const MENTION_QUERY = /(?:^|\s)@([^\s@]*)$/;
const BOUNDARY = "(?=$|[\\s.,!?;:)])";
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest names first, so "@Ana Lima" is never read as "@Ana".
function byLongestName(people) {
  return people.filter((p) => p?.name).sort((a, b) => b.name.length - a.name.length);
}

// Ids of the members whose `@Name` appears in the text.
export function mentionedIds(text, members) {
  let rest = String(text || "");
  const ids = [];
  for (const m of byLongestName(members)) {
    const next = rest.replace(new RegExp(`@${escapeRegExp(m.name)}${BOUNDARY}`, "g"), " ");
    if (next !== rest) {
      ids.push(m.id);
      rest = next;
    }
  }
  return ids;
}

// Comment text with the mentioned members' `@Name` tokens highlighted.
export function MentionText({ text, people }) {
  const names = byLongestName(people).map((p) => escapeRegExp(p.name));
  if (!names.length) return text;
  return String(text)
    .split(new RegExp(`(@(?:${names.join("|")})${BOUNDARY})`, "g"))
    .map((part, i) =>
      i % 2 ? (
        <span key={i} className="rounded bg-sky-500/10 px-0.5 font-medium text-sky-700 dark:text-sky-300">{part}</span>
      ) : (
        part
      ),
    );
}

// Single-line comment input with @member autocomplete; Enter picks a suggestion while the list is open, else submits.
export function MentionInput({ value, onChange, members, onSubmit, ...props }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [mention, setMention] = useState(null);
  const [active, setActive] = useState(0);

  const q = mention?.query.toLowerCase() ?? "";
  const suggestions = mention ? members.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(q)).slice(0, 6) : [];
  const open = suggestions.length > 0;
  const current = Math.min(active, suggestions.length - 1);

  const track = (text, caret) => {
    const match = text.slice(0, caret).match(MENTION_QUERY);
    setMention(match ? { start: caret - match[1].length - 1, end: caret, query: match[1] } : null);
    setActive(0);
  };

  const pick = (member) => {
    const token = `@${member.name} `;
    const caret = mention.start + token.length;
    onChange(value.slice(0, mention.start) + token + value.slice(mention.end));
    setMention(null);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(caret, caret));
  };

  const onKeyDown = (e) => {
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActive((current + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
    } else if (open && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      pick(suggestions[current]);
    } else if (open && e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      {open ? (
        <div id={listId} role="listbox" aria-label="Mention a teammate" className="absolute inset-x-0 bottom-full z-10 mb-2 flex flex-col rounded-md border border-border bg-surface-subtle p-1 shadow-md">
          {suggestions.map((m, i) => (
            <Button
              key={m.id}
              id={`${listId}-${m.id}`}
              type="button"
              variant="ghost"
              role="option"
              aria-selected={i === current}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m)}
              className={cn("h-auto justify-start gap-2 rounded-sm px-2 py-1.5 text-sm font-normal text-foreground hover:bg-surface-active hover:text-foreground", i === current && "bg-surface-active")}
            >
              <MemberAvatar person={m} />
              <span className="truncate">{m.name}</span>
              <span className="ml-auto truncate text-xs text-text-tertiary">{m.roleName || m.email}</span>
            </Button>
          ))}
        </div>
      ) : null}
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${suggestions[current].id}` : undefined}
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        // Caret moves (arrows, clicks) re-read the @query so a pick never lands at a stale position.
        onSelect={(e) => track(e.currentTarget.value, e.currentTarget.selectionStart ?? e.currentTarget.value.length)}
        onBlur={() => setMention(null)}
        onKeyDown={onKeyDown}
        {...props}
      />
    </div>
  );
}
