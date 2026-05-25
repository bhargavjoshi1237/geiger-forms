"use client";

import {
  Archive,
  Clipboard,
  Clock3,
  Copy,
  Edit3,
  Folder,
  FolderOpen,
  Link2,
  Lock,
  Share2,
  Users,
} from "lucide-react";
import { FormsScreenShell } from "../screen-shell";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const folders = [
  { name: "Customer operations", forms: 5, members: 8, access: "Shared", updated: "Today", Icon: FolderOpen },
  { name: "Marketing", forms: 3, members: 3, access: "Private", updated: "May 20", Icon: Folder },
  { name: "Archived campaigns", forms: 9, members: 0, access: "Archived", updated: "May 12", Icon: Archive },
  { name: "HR & Onboarding", forms: 4, members: 5, access: "Shared", updated: "May 15", Icon: FolderOpen },
  { name: "Engineering", forms: 2, members: 6, access: "Private", updated: "May 10", Icon: Lock },
  { name: "Events", forms: 7, members: 4, access: "Shared", updated: "May 8", Icon: FolderOpen },
];

const accessStyle = {
  Shared: { bg: "bg-[#0e1e2e]", text: "text-[#60a5fa]", border: "border-[#1e3a5f]" },
  Private: { bg: "bg-[#202020]", text: "text-[#737373]", border: "border-[#2a2a2a]" },
  Archived: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export function FoldersScreen() {
  const copyFolderLink = (name) => {
    if (typeof window === "undefined") return;

    navigator.clipboard?.writeText(`${window.location.origin}/forms?view=Folders&folder=${slugify(name)}`);
  };

  return (
    <FormsScreenShell
      eyebrow="Organization"
      title="Folders"
      description="Group forms by team, lifecycle, or workflow so the workspace stays easy to scan."
      action="New folder"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => {
          const style = accessStyle[folder.access] ?? accessStyle.Private;
          return (
            <ContextMenu key={folder.name}>
              <ContextMenuTrigger asChild>
                <article className="flex flex-col gap-3 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-colors hover:border-[#3a3a3a]">
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#202020]">
                      <folder.Icon className="h-4 w-4 text-[#a3a3a3]" />
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text} ${style.border}`}>
                      {folder.access}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white">{folder.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373]">
                      <span>
                        {folder.forms} {folder.forms === 1 ? "form" : "forms"}
                      </span>
                      {folder.members > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {folder.members} {folder.members === 1 ? "member" : "members"}
                          </span>
                        </>
                      )}
                      {folder.members === 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#525252]">No members</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border-t border-[#242424] pt-2.5 text-[10px] text-[#525252]">
                    <Clock3 className="h-3 w-3" />
                    Updated {folder.updated}
                  </div>
                </article>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-52 bg-[#202020] border-[#333333] shadow-xl">
                <ContextMenuItem
                  className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => navigator.clipboard?.writeText(folder.name)}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Open folder
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => navigator.clipboard?.writeText(`${folder.name} copy`)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => navigator.clipboard?.writeText(`Share ${folder.name}`)}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => navigator.clipboard?.writeText(`Rename ${folder.name}`)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Rename
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-[#333333]" />
                <ContextMenuItem
                  className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => navigator.clipboard?.writeText(folder.name)}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Copy name
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => copyFolderLink(folder.name)}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Copy link
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-[#333333]" />
                <ContextMenuItem
                  className="text-[#ef4444] focus:bg-[#2a0808] focus:text-[#f87171] cursor-pointer gap-2"
                  onSelect={() => navigator.clipboard?.writeText(`${folder.name} archived`)}
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </FormsScreenShell>
  );
}
