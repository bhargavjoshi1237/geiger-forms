"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  CircleUserRound,
  Settings,
  Wallet,
  LogOut,
  Moon,
  Sun,
  UsersRound,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  BookMarked,
  ExternalLink,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUser, invalidateUserCache } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/client";

const surfaceStyle = {
  backgroundColor: "var(--surface-dialog)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

const itemBaseStyle =
  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-default transition-colors outline-none";

const itemHoverStyle =
  "hover:bg-surface-active focus:bg-surface-active text-muted-foreground hover:text-foreground focus:text-foreground";

export function ProfileDropdown({ children }) {
  const [user, setUser] = useState(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getUser().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  // Suite-shared public bucket: pfp/<userId>/latest.jpg. 404s fall back to
  // the gradient initials via AvatarFallback.
  const pfpUrl = user?.id
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pfp/${user.id}/latest.jpg`
    : null;

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "user@email.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    try {
      await createClient().auth.signOut();
    } catch {
      // ignore — clearing local state below is enough to reflect signed-out
    }
    invalidateUserCache();
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <button
            type="button"
            aria-label="Account"
            className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border transition-colors hover:border-border-strong"
          >
            <Avatar className="size-full">
              {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName} />}
              <AvatarFallback className="border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-[10px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 rounded-xl border p-0 shadow-xl"
        style={surfaceStyle}
        sideOffset={8}
        align="end"
      >
        <div className="p-4 pb-3">
          <DropdownMenuLabel className="p-0">
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="border border-border">
                {pfpUrl && <AvatarImage src={pfpUrl} alt={displayName} />}
                <AvatarFallback className="border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </div>

        <DropdownMenuSeparator className="mx-0 bg-surface-hover" />

        <div className="p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <CircleUserRound className="size-4 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <UsersRound className="size-4 text-muted-foreground" />
              <span>Organization Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <Wallet className="size-4 text-muted-foreground" />
              <span>Billing & Plans</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-surface-hover" />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="cursor-default p-2 hover:bg-transparent focus:bg-transparent"
            >
              <div className="flex w-full items-center justify-evenly rounded-lg bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  data-state={theme === "light" ? "on" : "off"}
                  className="flex h-7 flex-1 items-center justify-center rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-surface-card hover:text-foreground data-[state=on]:bg-surface-active data-[state=on]:text-foreground"
                  aria-label="Light theme"
                >
                  <Sun className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  data-state={theme === "dark" ? "on" : "off"}
                  className="flex h-7 flex-1 items-center justify-center rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-surface-card hover:text-foreground data-[state=on]:bg-surface-active data-[state=on]:text-foreground"
                  aria-label="Dark theme"
                >
                  <Moon className="size-3.5" />
                </button>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <Settings className="size-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <ShieldCheck className="size-4 text-muted-foreground" />
              <span>Security</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-surface-hover" />

          <DropdownMenuGroup>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <BookMarked className="size-4 text-muted-foreground" />
              <span>Documentation</span>
              <ExternalLink className="ml-auto size-3 text-text-secondary" />
            </DropdownMenuItem>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <MessageCircle className="size-4 text-muted-foreground" />
              <span>Send Feedback</span>
            </DropdownMenuItem>
            <DropdownMenuItem className={`${itemBaseStyle} ${itemHoverStyle}`}>
              <LifeBuoy className="size-4 text-muted-foreground" />
              <span>Help & Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleSignOut}
              className={`${itemBaseStyle} group text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive`}
            >
              <LogOut className="size-4 group-hover:text-red-400" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </div>

        <div className="border-t border-border px-4 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>Forms v1.0.0</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
