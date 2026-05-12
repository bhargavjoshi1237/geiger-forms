"use client";

import Image from "next/image";
import { BarChart3, ClipboardList, FileQuestion, Inbox, LockKeyhole, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "Forms", Icon: FileQuestion },
  { id: "Builder", Icon: ClipboardList },
  { id: "Responses", Icon: Inbox },
  { id: "Analytics", Icon: BarChart3 },
  { id: "Access", Icon: LockKeyhole },
  { id: "Settings", Icon: Settings2 },
];

export function AppShell({ activeView, onViewChange, children }) {
  return (
    <div className="flex h-[100dvh] bg-[#161616] text-[#ededed]">
      <aside className="hidden w-64 shrink-0 border-r border-[#2a2a2a] bg-[#1a1a1a] md:flex md:flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-[#2a2a2a] px-4">
          <Image src="/logo1.svg" alt="" width={22} height={22} />
          <div>
            <p className="text-sm font-semibold text-white">Geiger Forms</p>
            <p className="text-[11px] text-[#737373]">Confidential intake</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map(({ id, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                activeView === id ? "bg-[#2a2a2a] text-white" : "text-[#a3a3a3] hover:bg-[#242424] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {id}
            </button>
          ))}
        </nav>
        <div className="border-t border-[#2a2a2a] p-3 text-xs leading-5 text-[#737373]">
          Built for project members, reviewers, and approved external submitters.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2a2a] bg-[#161616]/95 px-4 md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <Image src="/logo1.svg" alt="" width={22} height={22} />
            <span className="text-sm font-semibold">Geiger Forms</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-[#ededed]">Workspace</p>
            <p className="text-xs text-[#737373]">Project-bound forms and submissions</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs text-teal-200">
            <LockKeyhole className="h-3.5 w-3.5" />
            Clause protected
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-subtle">{children}</main>
      </div>
    </div>
  );
}
