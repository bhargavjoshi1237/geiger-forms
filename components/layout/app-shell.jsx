"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PanelLeft, X } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { formNavItems } from "@/components/internal/sidebar/sidebar_nav";
import { cn } from "@/lib/utils";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

function SidebarContent({ activeView, onViewChange, onNavigate, showHeader = false, collapsed = false, onToggle }) {
  return (
    <>
      {showHeader ? (
        <div className="flex h-14 items-center gap-2 border-b border-[#2a2a2a] bg-[#1a1a1a] px-4">
          <div className="grid h-8 w-8 place-items-center rounded">
            <Image src={`${assetPrefix}/logo1.svg`} alt="" width={20} height={20} className="h-5 w-5" />
          </div>
          <div className="border-l border-[#333333] pl-3">
            <p className="text-sm font-semibold text-white">Form</p>
          </div>
        </div>
      ) : null}
      <nav className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", !collapsed && "px-1")}>
        <div className={cn("relative flex w-full min-w-0 flex-col py-2", !collapsed && "px-2")}>
          <ul className={cn("flex w-full min-w-0 flex-col gap-1", collapsed && "items-center")}>
        {formNavItems.map(({ id, title, Icon }) => (
          <li key={id} className="relative">
          <button
            type="button"
            onClick={() => {
              onViewChange(id);
              onNavigate?.();
            }}
            className={cn(
              "flex h-9 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#474747]",
              collapsed && "mx-auto h-8 w-8 justify-center p-0",
              activeView === id
                ? "bg-[#2a2a2a] font-medium text-white"
                : "text-[#a3a3a3] hover:bg-[#2a2a2a] hover:text-white",
            )}
            title={collapsed ? title : undefined}
          >
            <Icon className={cn("h-4 w-4 shrink-0", collapsed && "h-[18px] w-[18px]")} strokeWidth={2} />
            <span className={cn("truncate", collapsed && "sr-only")}>{title}</span>
          </button>
          </li>
        ))}
          </ul>
        </div>
      </nav>
      <div className="border-t border-[#2a2a2a] p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg p-2 text-[#a3a3a3] transition-all hover:bg-[#2a2a2a] hover:text-white",
            collapsed && "mx-auto h-8 w-8 justify-center p-0",
          )}
          aria-label="Collapse sidebar"
          aria-expanded={!collapsed}
        >
          <PanelLeft className="h-5 w-5 shrink-0" />
        </button>
      </div>
    </>
  );
}

export function AppShell({
  activeView = "",
  onViewChange = () => {},
  children,
  className,
  contentClassName,
  topbarTitle,
  topbarActionsBeforeSearch,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={cn("flex flex-col bg-[#161616] text-white", className || "h-[100dvh]")}>
      <Topbar
        onMenuClick={() => setMobileOpen(true)}
        title={topbarTitle}
        actionsBeforeSearch={topbarActionsBeforeSearch}
      />

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-[#a3a3a3] transition-colors hover:bg-[#242424] hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              activeView={activeView}
              onViewChange={onViewChange}
              onNavigate={() => setMobileOpen(false)}
              showHeader
              onToggle={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-[#2a2a2a] bg-[#1a1a1a] text-[#a3a3a3] transition-[width] duration-200 ease-linear md:flex md:flex-col",
            collapsed ? "w-12" : "w-64",
          )}
        >
          <SidebarContent
            activeView={activeView}
            onViewChange={onViewChange}
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
          />
        </aside>
        <main className={cn("flex-1 overflow-y-auto bg-[#161616] p-4 md:p-8 scrollbar-subtle", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
