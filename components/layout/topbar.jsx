"use client";

import Image from "next/image";
import { Bell, HelpCircle, PanelLeft, Search, UserCircle } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import ThemeToggle from "@/components/ui/theme-toggle";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

export function Topbar({ onMenuClick, title = "Form", actionsBeforeSearch }) {
  return (
    <header className="z-20 flex h-14 w-full shrink-0 items-center justify-between border-b border-topbar-border bg-topbar-bg px-4 text-foreground backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-active hover:text-foreground md:hidden"
          aria-label="Open navigation"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded md:-ml-1.5">
          <Image src={`${assetPrefix}/logo1.svg`} alt="" width={20} height={20} className="-mr-0.5 h-5 w-5" />
        </div>
        <div className="hidden cursor-pointer items-center border-l border-border pl-2 sm:flex">
          <span className="ml-1 text-sm font-semibold text-white">{title}</span>
        </div>
      </div>

      <div className="flex justify-between gap-4 md:gap-8 sm:mr-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {actionsBeforeSearch ? <div className="hidden items-center gap-1 lg:flex">{actionsBeforeSearch}</div> : null}
          <button
            type="button"
            className="group relative hidden h-8 w-[240px] items-center justify-start rounded-md border border-border bg-surface-card px-2.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-border-strong hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground sm:mr-2" />
            <span className="hidden text-muted-foreground transition-colors group-hover:text-foreground sm:inline-block">
              Search...
            </span>
            <div className="absolute right-1.5 top-1.5 hidden items-center gap-1 sm:flex">
              <KbdGroup>
                <Kbd className="border border-border bg-background text-muted-foreground transition-colors group-hover:bg-surface-active group-hover:text-foreground">
                  Ctrl
                </Kbd>
                <Kbd className="border border-border bg-background text-muted-foreground transition-colors group-hover:bg-surface-active group-hover:text-foreground">
                  K
                </Kbd>
              </KbdGroup>
            </div>
          </button>

          <div className="ml-0 flex items-center gap-0 sm:ml-1 sm:gap-1">
            <ThemeToggle />
            <button
              type="button"
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:bg-surface-active hover:text-foreground sm:flex"
              aria-label="Help"
            >
              <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="relative hidden h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:bg-surface-active hover:text-foreground sm:flex"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              aria-label="Profile"
            >
              <UserCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
