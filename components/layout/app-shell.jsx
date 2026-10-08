"use client";

import { SidebarInset, SidebarProvider } from "@geiger/ui/sidebar";
import { Topbar } from "@/components/internal/topbar/topbar";
import { AppSidebar } from "@/components/internal/sidebar/sidebar";
import { cn } from "@/lib/utils";

// Workspace frame (@geiger/ui topbar + sidebar + content), matching geiger-events' WorkspaceShell.
export function AppShell({
  activeView = "",
  onViewChange = () => {},
  children,
  className,
  contentClassName,
}) {
  return (
    <div className={cn("flex w-full flex-col overflow-hidden bg-background text-foreground", className || "h-[100dvh]")}>
      <SidebarProvider className="!flex h-full min-w-0 flex-col" style={{ flexDirection: "column" }}>
        <Topbar onViewChange={onViewChange} />
        <div className="relative flex flex-1 overflow-hidden">
          <AppSidebar activeView={activeView} onViewChange={onViewChange} />
          <SidebarInset className="relative flex h-full flex-1 flex-col overflow-hidden border-none bg-transparent">
            <main className={cn("w-full min-w-0 flex-1 overflow-y-auto bg-background p-4 md:p-8 scrollbar-subtle", contentClassName)}>
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
