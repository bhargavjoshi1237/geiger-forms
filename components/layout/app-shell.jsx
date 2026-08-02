"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, PanelLeft, X } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { formNav, isBuiltView, groupForView } from "@/components/internal/sidebar/sidebar_nav";
import { cn } from "@/lib/utils";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

function SidebarContent({ activeView, onViewChange, onNavigate, showHeader = false, collapsed = false, onToggle }) {
  // Explicit user toggles; a group with no entry falls back to "open if it holds
  // the active view" so the current section is always visible.
  const [expanded, setExpanded] = useState({});

  const go = (id) => {
    onViewChange(id);
    onNavigate?.();
  };
  const toggleGroup = (name) => setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <>
      {showHeader ? (
        <div className="flex h-14 items-center gap-2 border-b border-border bg-surface-subtle px-4">
          <div className="grid h-8 w-8 place-items-center rounded">
            <Image src={`${assetPrefix}/logo1.svg`} alt="" width={20} height={20} className="h-5 w-5" />
          </div>
          <div className="border-l border-border pl-3">
            <p className="text-sm font-semibold text-white">Forms</p>
          </div>
        </div>
      ) : null}
      <nav className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", !collapsed && "px-1")}>
        <div className={cn("relative flex w-full min-w-0 flex-col py-2", !collapsed && "px-2")}>
          <ul className={cn("flex w-full min-w-0 flex-col gap-1", collapsed && "items-center")}>
            {formNav.map((node) => {
              // Leaf item (e.g. Overview).
              if (!node.children) {
                const active = activeView === node.id;
                return (
                  <li key={node.id} className="relative">
                    <button
                      type="button"
                      onClick={() => go(node.id)}
                      className={cn(
                        "flex h-9 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-strong",
                        collapsed && "mx-auto h-8 w-8 justify-center p-0",
                        active
                          ? "bg-surface-hover font-medium text-white"
                          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                      )}
                      title={collapsed ? node.title : undefined}
                    >
                      <node.Icon className={cn("h-4 w-4 shrink-0", collapsed && "h-[18px] w-[18px]")} strokeWidth={2} />
                      <span className={cn("truncate", collapsed && "sr-only")}>{node.title}</span>
                    </button>
                  </li>
                );
              }

              // Group with sub-items.
              const hasActiveChild = groupForView(activeView) === node.group;
              const isOpen = expanded[node.group] ?? hasActiveChild;

              // Collapsed rail: show the group icon; clicking expands the sidebar.
              if (collapsed) {
                return (
                  <li key={node.group} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        onToggle?.();
                        setExpanded((prev) => ({ ...prev, [node.group]: true }));
                      }}
                      className={cn(
                        "mx-auto flex h-8 w-8 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-strong",
                        hasActiveChild
                          ? "bg-surface-hover text-white"
                          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                      )}
                      title={node.group}
                    >
                      <node.Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    </button>
                  </li>
                );
              }

              return (
                <li key={node.group} className="relative">
                  <button
                    type="button"
                    onClick={() => toggleGroup(node.group)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex h-9 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-strong",
                      isOpen
                        ? "bg-surface-hover/40 text-foreground"
                        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                    )}
                  >
                    <node.Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="truncate flex-1">{node.group}</span>
                    <ChevronDown
                      className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                      strokeWidth={2}
                    />
                  </button>

                  {isOpen ? (
                    <ul className="ml-[1px] mb-1 mt-1 flex flex-col gap-0.5 pl-2">
                      {node.children.map((child) => {
                        const active = activeView === child.id;
                        const soon = !isBuiltView(child.id);
                        return (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => go(child.id)}
                              className={cn(
                                "relative flex h-[35px] w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-strong",
                                active
                                  ? "bg-surface-hover font-medium text-white"
                                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                              )}
                            >
                              <child.Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                              <span className="truncate flex-1">{child.title}</span>
                              {soon ? (
                                <span className="shrink-0 rounded bg-surface-active px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-tertiary">
                                  Soon
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg p-2 text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground",
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
    <div className={cn("flex flex-col bg-background text-white", className || "h-[100dvh]")}>
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
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-surface-subtle shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-active hover:text-foreground"
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
            "hidden shrink-0 border-r border-border bg-surface-subtle text-muted-foreground transition-[width] duration-200 ease-linear md:flex md:flex-col",
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
        <main className={cn("flex-1 overflow-y-auto bg-background p-4 md:p-8 scrollbar-subtle", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
