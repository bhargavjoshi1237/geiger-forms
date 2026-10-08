"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from "@geiger/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { SidebarOption } from "./sidebar_option";
import { MobileSidebarHeader } from "./mobile_sidebar_header";
import { formNav, groupForView, isBuiltView } from "./sidebar_nav";

const isSoon = (id) => !isBuiltView(id);

// Workspace sidebar built on @geiger/ui/sidebar, matching geiger-events' AppSidebar.
export function AppSidebar({ activeView = "Overview", onViewChange = () => {} }) {
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  // Explicit user toggles; a group without one stays open while it holds the active view.
  const [expandedItems, setExpandedItems] = React.useState({});

  const toggleExpand = (group) => {
    setExpandedItems((prev) => ({ ...prev, [group]: !(prev[group] ?? groupForView(activeView) === group) }));
  };

  const select = (id) => {
    onViewChange(id);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar border-r border-sidebar-border text-sidebar-foreground"
    >
      <MobileSidebarHeader />
      <SidebarContent className="py-1 space-y-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {formNav.map((node) =>
                node.children ? (
                  <SidebarOption
                    key={node.group}
                    title={node.group}
                    icon={node.Icon}
                    subItems={node.children}
                    isExpanded={expandedItems[node.group] ?? groupForView(activeView) === node.group}
                    onToggle={() => toggleExpand(node.group)}
                    activeId={activeView}
                    onSelect={select}
                    isSoon={isSoon}
                  />
                ) : (
                  <SidebarOption
                    key={node.id}
                    title={node.title}
                    icon={node.Icon}
                    isActive={activeView === node.id}
                    onSelect={() => select(node.id)}
                  />
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
        <Button
          type="button"
          variant="ghost"
          aria-label={state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleSidebar}
          className="flex items-center gap-3 p-2 w-full rounded-lg hover:bg-sidebar-accent transition-all text-sidebar-foreground hover:text-foreground group-data-[collapsible=icon]:justify-center"
        >
          <PanelLeft className="w-5 h-5 shrink-0" />
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
