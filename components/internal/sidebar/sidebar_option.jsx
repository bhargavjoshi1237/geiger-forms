"use client";

import React from "react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@geiger/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@geiger/ui/tooltip";

function SoonBadge() {
  return (
    <span className="ml-auto shrink-0 rounded bg-surface-active px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-tertiary">
      Soon
    </span>
  );
}

// Mirrors geiger-events' SidebarOption; nav items are `{ id, title, Icon }` and selection is by id.
export function SidebarOption({
  title,
  icon: Icon,
  isActive,
  onSelect,
  subItems,
  isExpanded,
  onToggle,
  activeId,
  isSoon,
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={subItems ? onToggle : () => onSelect?.()}
        isActive={isActive}
        tooltip={title}
        aria-expanded={subItems ? Boolean(isExpanded) : undefined}
        className={cn(
          "transition-all text-sm h-9 group-data-[collapsible=icon]:justify-center",
          isActive && !subItems
            ? "bg-sidebar-accent text-foreground"
            : isExpanded
              ? "bg-sidebar-accent/40 text-sidebar-foreground"
              : "text-sidebar-foreground",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              isActive ? "text-foreground" : "text-sidebar-foreground/70",
            )}
          />
        )}
        {!isCollapsed && <span>{title}</span>}
        {subItems && !isCollapsed && (
          <ChevronDown
            className={cn(
              "ml-auto w-4 h-4 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        )}
      </SidebarMenuButton>

      {subItems && isExpanded && !isCollapsed && (
        <ul className="ml-[1px] mt-1 mb-1 flex flex-col gap-0.5 pl-2">
          {subItems.map((sub) => (
            <li key={sub.id}>
              <Button
                type="button"
                variant="ghost"
                data-active={activeId === sub.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(sub.id);
                }}
                className={cn(
                  "relative w-full flex items-center justify-start px-2 h-[35px] rounded-md text-sm leading-none transition-colors gap-2",
                  activeId === sub.id
                    ? "bg-sidebar-accent text-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50",
                )}
              >
                {sub.Icon && (
                  <sub.Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      activeId === sub.id ? "text-foreground" : "text-sidebar-foreground/70",
                    )}
                  />
                )}
                <p className="truncate">{sub.title}</p>
                {isSoon?.(sub.id) && <SoonBadge />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {subItems && isExpanded && isCollapsed && (
        <ul className="flex flex-col gap-0.5 pt-2">
          {subItems.map((sub) => (
            <li key={sub.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={sub.title}
                    data-active={activeId === sub.id ? "true" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelect(sub.id);
                    }}
                    className={cn(
                      "relative w-full flex items-center justify-center px-2 h-[35px] rounded-md text-sm leading-none transition-colors",
                      activeId === sub.id
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    {sub.Icon && (
                      <sub.Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          activeId === sub.id ? "text-foreground" : "text-sidebar-foreground/70",
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {sub.title}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </SidebarMenuItem>
  );
}
