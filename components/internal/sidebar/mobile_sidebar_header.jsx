"use client";

import Logo from "@geiger/ui/logo";
import { SidebarHeader, useSidebar } from "@geiger/ui/sidebar";

// Brand header shown only inside the mobile sidebar sheet (desktop shows it in the topbar).
export function MobileSidebarHeader() {
  const { isMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <SidebarHeader className="p-0 border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0">
            <Logo size={20} className="text-foreground" />
          </div>
          <span className="text-foreground font-semibold text-sm truncate max-w-full">
            Forms
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}

export default MobileSidebarHeader;
