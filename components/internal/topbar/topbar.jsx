"use client";

import { Bell } from "lucide-react";
import { Topbar as SuiteTopbar } from "@geiger/ui/topbar";
import { Button } from "@geiger/ui/button";
import { SidebarTrigger } from "@geiger/ui/sidebar";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { formNav } from "@/components/internal/sidebar/sidebar_nav";
import { NotificationsDropdown } from "./dialogue/notifications_dropdown";
import { SupabaseActivityLine } from "./supabase_activity_line";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

// Sidebar nav in the CommandPalette's `{ title, icon, subItems }` shape; each entry keeps its view `id`.
const SEARCH_NAV = formNav.map((node) =>
  node.children
    ? { title: node.group, icon: node.Icon, subItems: node.children.map((child) => ({ id: child.id, title: child.title, icon: child.Icon })) }
    : { id: node.id, title: node.title, icon: node.Icon },
);

// Shared suite topbar (logo, ⌘K search palette, help, notifications, profile), matching geiger-events.
export function Topbar({ onViewChange = () => {} }) {
  return (
    <SuiteTopbar
      label="Forms"
      logoSrc={`${assetPrefix}/logo1.svg`}
      homeHref={assetPrefix || "/"}
      searchPlaceholder="Search Forms..."
      searchNav={SEARCH_NAV}
      searchRecentsKey="geiger:forms:search-recents"
      onSearchSelect={(item) => item?.id && onViewChange(item.id)}
      sidebarTrigger={<SidebarTrigger className="md:hidden -ml-2 text-foreground" />}
      notifications={
        <NotificationsDropdown>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            className="w-8 h-8 rounded-full border border-transparent hover:bg-surface-hover hidden items-center justify-center transition-colors text-muted-foreground hover:text-foreground relative sm:flex"
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
          </Button>
        </NotificationsDropdown>
      }
      profile={<ProfileDropdown />}
      activity={<SupabaseActivityLine />}
    />
  );
}
