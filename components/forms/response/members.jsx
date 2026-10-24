"use client";

import { useId, useState } from "react";
import { Check, UserRound, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@geiger/ui/avatar";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { cn } from "@/lib/utils";

export function MemberAvatar({ person, size = "sm", className }) {
  return (
    <Avatar size={size} className={cn("border border-border", className)}>
      {person?.avatarUrl ? <AvatarImage src={person.avatarUrl} alt="" /> : null}
      <AvatarFallback className="border-0 bg-surface-card text-[10px] font-semibold text-muted-foreground">{person?.initials || "?"}</AvatarFallback>
    </Avatar>
  );
}

// Avatar and name, or a muted placeholder when nobody is set.
export function PersonChip({ person, emptyLabel = "Unassigned", className }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", !person && "text-text-tertiary", className)}>
      {person ? <MemberAvatar person={person} /> : <UserRound className="size-4 shrink-0" />}
      <span className="truncate">{person ? person.name : emptyLabel}</span>
    </span>
  );
}

// AssigneePicker value for a response: the member id, null when unassigned, undefined for a legacy name-only assignee.
export function assigneeValue(response) {
  return response.assigneeId ?? (response.assignee ? undefined : null);
}

// One listbox row; `active` is the keyboard-highlighted row, `current` the assignee already set.
function PickerOption({ id, active, current, onSelect, children }) {
  return (
    <Button
      id={id}
      type="button"
      variant="ghost"
      role="option"
      tabIndex={-1}
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cn(
        "h-auto w-full justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-normal text-foreground hover:bg-surface-active hover:text-foreground",
        active && "bg-surface-active",
      )}
    >
      {children}
      {current ? <Check className="ml-auto size-3.5 shrink-0 text-text-secondary" /> : null}
    </Button>
  );
}

// Searchable assignee combobox (arrow keys + Enter); `children` is the trigger, `onChange` gets a member or null, undefined `value` means mixed (bulk).
export function AssigneePicker({ value, members, me, onChange, align = "start", children }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const q = query.trim().toLowerCase();
  const mixed = value === undefined;
  // `null` is the "Unassigned" row, offered while not searching.
  const entries = q ? members.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(q)) : [null, ...members];
  const current = Math.min(active, entries.length - 1);
  const isCurrent = (entry) => !mixed && (entry?.id ?? null) === value;
  const optionId = (entry) => `${listId}-${entry?.id ?? "none"}`;

  const toggle = (next) => {
    setOpen(next);
    setQuery("");
    setActive(next ? Math.max(0, [null, ...members].findIndex(isCurrent)) : 0);
  };
  const pick = (member) => {
    toggle(false);
    if (mixed || (member?.id ?? null) !== value) onChange(member);
  };
  const onKeyDown = (e) => {
    if (!entries.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (current + (e.key === "ArrowDown" ? 1 : entries.length - 1)) % entries.length;
      setActive(next);
      document.getElementById(optionId(entries[next]))?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(entries[current]);
    }
  };

  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-64 border-border bg-surface-subtle p-1.5">
        <Input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={entries.length ? optionId(entries[current]) : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Assign to…"
          aria-label="Search teammates"
          className="h-8 text-xs"
        />
        <div id={listId} role="listbox" aria-label="Teammates" className="scrollbar-subtle mt-1 flex max-h-64 flex-col overflow-y-auto">
          {entries.map((m, i) => (
            <PickerOption key={m?.id ?? "none"} id={optionId(m)} active={i === current} current={isCurrent(m)} onSelect={() => pick(m)}>
              {m ? (
                <>
                  <MemberAvatar person={m} />
                  <span className="min-w-0">
                    <span className="block truncate">{m.id === me?.id ? `${m.name} (you)` : m.name}</span>
                    {m.roleName || m.email ? <span className="block truncate text-xs text-text-tertiary">{m.roleName || m.email}</span> : null}
                  </span>
                </>
              ) : (
                <>
                  <UserX className="size-4 shrink-0 text-text-tertiary" /> Unassigned
                </>
              )}
            </PickerOption>
          ))}
          {!entries.length ? <p className="px-2 py-3 text-center text-xs text-text-tertiary">No teammates match</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
