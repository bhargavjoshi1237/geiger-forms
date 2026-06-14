"use client";

import React from "react";
import { Bell, HelpCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import ThemeToggle from "@/components/ui/theme-toggle";
import { SupabaseActivityLine } from "./supabase_activity_line";

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between border-b border-border bg-topbar-bg px-4 text-foreground">
      <div className="flex items-center gap-1.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded md:-ml-1.5">
          <img
            src="/logo1.svg"
            alt=""
            className="-mr-0.5 h-5 w-5"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.innerHTML =
                '<div class="w-2 h-2 bg-foreground rounded-full"></div>';
            }}
          />
        </div>
        <div className="hidden cursor-pointer items-center gap-1 pl-2 sm:flex md:border-l md:border-border">
          <span className="ml-1 text-sm font-semibold text-foreground">Forms</span>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:hidden">
        <img
          src="/logo1.svg"
          alt=""
          className="h-5 w-5"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <span className="text-sm font-semibold text-foreground">Forms</span>
      </div>

      <div className="flex justify-between gap-4 sm:mr-2 md:gap-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            className="group relative hidden h-8 w-[240px] items-center justify-start rounded-md border border-border bg-surface-active px-2.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-border-strong sm:flex"
          >
            <Search className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground sm:mr-2" />
            <span className="hidden text-muted-foreground transition-colors group-hover:text-foreground sm:inline-block">
              Search...
            </span>
            <div className="absolute right-1.5 top-1.5 hidden items-center gap-1 sm:flex">
              <KbdGroup>
                <Kbd className="border-border bg-surface-subtle text-muted-foreground transition-colors group-hover:bg-surface-hover group-hover:text-foreground">
                  ⌘
                </Kbd>
                <Kbd className="border-border bg-surface-subtle text-muted-foreground transition-colors group-hover:bg-surface-hover group-hover:text-foreground">
                  K
                </Kbd>
              </KbdGroup>
            </div>
          </Button>

          <div className="ml-0 flex items-center gap-0 sm:ml-1 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:flex"
            >
              <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground sm:flex"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            </Button>
            <ThemeToggle />
            <button
              type="button"
              aria-label="Account"
              className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-active text-xs font-semibold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              G
            </button>
          </div>
        </div>
      </div>
      <SupabaseActivityLine />
    </header>
  );
}
