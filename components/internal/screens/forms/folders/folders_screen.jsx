"use client";

import { useMemo } from "react";
import { Clock3, FolderOpen, Link2 } from "lucide-react";
import { FormsScreenShell, LoadingState } from "../screen-shell";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useForms } from "@/lib/hooks/use-forms";
import { relativeTime } from "@/lib/forms/schema";

const UNCATEGORIZED = "Uncategorized";

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

function laterIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function buildFolders(forms) {
  const groups = new Map();
  for (const f of forms) {
    const name = f.category || UNCATEGORIZED;
    if (!groups.has(name)) {
      groups.set(name, { name, slug: slugify(name), forms: 0, published: 0, updatedAt: null });
    }
    const g = groups.get(name);
    g.forms += 1;
    if (f.status === "Published") g.published += 1;
    g.updatedAt = laterIso(g.updatedAt, f.updatedAt);
  }
  return [...groups.values()].sort((a, b) => b.forms - a.forms);
}

export function FoldersScreen() {
  const { forms, loading } = useForms();

  const folders = useMemo(() => buildFolders(forms), [forms]);

  const copyFolderLink = (slug) => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(`${window.location.origin}/forms?view=Forms&category=${slug}`);
  };

  return (
    <FormsScreenShell
      eyebrow="Organization"
      title="Folders"
      description="Group forms by team, lifecycle, or workflow so the workspace stays easy to scan."
    >
      {loading ? (
        <LoadingState label="Loading folders…" />
      ) : folders.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-[#333333] bg-[#1a1a1a] p-8 text-center">
          <FolderOpen className="mb-3 h-6 w-6 text-[#525252]" />
          <p className="text-sm font-medium text-[#e7e7e7]">No folders yet</p>
          <p className="mt-1 max-w-md text-xs leading-5 text-[#737373]">
            Assign categories to your forms and they will be grouped into folders here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <ContextMenu key={folder.name}>
              <ContextMenuTrigger asChild>
                <a
                  href={`/forms?view=Forms&category=${folder.slug}`}
                  className="flex flex-col gap-3 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-colors hover:border-[#3a3a3a]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#202020]">
                      <FolderOpen className="h-4 w-4 text-[#a3a3a3]" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white">{folder.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373]">
                      <span>
                        {folder.forms} {folder.forms === 1 ? "form" : "forms"}
                      </span>
                      <span>·</span>
                      <span>{folder.published} published</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border-t border-[#242424] pt-2.5 text-[10px] text-[#525252]">
                    <Clock3 className="h-3 w-3" />
                    Updated {relativeTime(folder.updatedAt)}
                  </div>
                </a>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-52 bg-[#202020] border-[#333333] shadow-xl">
                <ContextMenuItem asChild className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2">
                  <a href={`/forms?view=Forms&category=${folder.slug}`}>
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open
                  </a>
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                  onSelect={() => copyFolderLink(folder.slug)}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Copy link
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}
    </FormsScreenShell>
  );
}
