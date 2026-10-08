"use client";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@geiger/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@geiger/ui/tooltip";

const MAX = 3;

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Avatars of the other people editing this form right now.
export function PresenceAvatars({ others }) {
  if (!others?.length) return null;
  const shown = others.slice(0, MAX);
  const extra = others.length - shown.length;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="mr-1 flex items-center" aria-label={`${others.length} other ${others.length === 1 ? "person" : "people"} editing`}>
          <AvatarGroup>
            {shown.map((p) => (
              <Avatar key={p.key} size="sm" className="ring-2 ring-background">
                {p.avatar ? <AvatarImage src={p.avatar} alt={p.name} /> : null}
                <AvatarFallback className="bg-surface-hover text-[10px] font-medium text-foreground">{initials(p.name)}</AvatarFallback>
              </Avatar>
            ))}
            {extra > 0 ? <AvatarGroupCount className="size-6 text-[10px]">+{extra}</AvatarGroupCount> : null}
          </AvatarGroup>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">Also editing</p>
        {others.map((p) => <p key={p.key}>{p.name}</p>)}
      </TooltipContent>
    </Tooltip>
  );
}
