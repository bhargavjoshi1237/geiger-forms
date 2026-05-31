"use client";

import {
  Clipboard,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  Link2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormsScreenShell, LoadingState, EmptyState } from "../screen-shell";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useForms } from "@/lib/hooks/use-forms";

export function TemplatesScreen() {
  const router = useRouter();
  const { forms, loading } = useForms();

  const openTemplate = (slug) => router.push(`/forms/${slug}`);
  const previewTemplate = (slug) => router.push(`/form/${slug}`);
  const duplicateTemplate = (slug) => router.push(`/forms/${slug}-copy`);
  const copyTemplateLink = (slug) => {
    if (typeof window === "undefined") return;

    navigator.clipboard?.writeText(`${window.location.origin}/forms/${slug}`);
  };

  return (
    <FormsScreenShell
      eyebrow="Library"
      title="Templates"
      description="Reuse your existing forms as starting points for new collection workflows."
      action="Create template"
    >
      {loading ? (
        <LoadingState label="Loading templates…" />
      ) : forms.length === 0 ? (
        <EmptyState
          Icon={FileText}
          title="No forms yet"
          description="No forms yet — create one to reuse it as a template."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const detail = form.description || "Reuse this form as a starting point for a new collection flow.";
            const popular = form.responses > 0;

            return (
              <ContextMenu key={form.id}>
                <ContextMenuTrigger asChild>
                  <article className="group flex flex-col overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#3a3a3a]">
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#202020]">
                        <FileText className="h-4 w-4 text-[#a3a3a3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-white">{form.name}</h3>
                          {popular && (
                            <span className="rounded-full border border-[#166534] bg-[#0d2218] px-1.5 py-0 text-[10px] font-medium text-[#4ade80]">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-[#737373]">{detail}</p>
                        <p className="mt-2 text-[11px] text-[#525252]">
                          {form.fields} fields · {form.responses} responses
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-[#242424] px-4 py-2.5">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-[#525252]">
                        {form.category || ""}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTemplate(form.slug)}
                        className="h-6 border-[#2a2a2a] bg-[#202020] px-3 text-xs text-[#a3a3a3] hover:border-[#474747] hover:bg-[#2a2a2a] hover:text-white"
                      >
                        Use
                      </Button>
                    </div>
                  </article>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-52 bg-[#202020] border-[#333333] shadow-xl">
                  <ContextMenuItem
                    className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                    onSelect={() => openTemplate(form.slug)}
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    Use template
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                    onSelect={() => previewTemplate(form.slug)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                    onSelect={() => duplicateTemplate(form.slug)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicate
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-[#333333]" />
                  <ContextMenuItem
                    className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                    onSelect={() => navigator.clipboard?.writeText(form.name)}
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    Copy name
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                    onSelect={() => copyTemplateLink(form.slug)}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Copy link
                  </ContextMenuItem>
                  {form.category && (
                    <ContextMenuItem
                      className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                      onSelect={() => navigator.clipboard?.writeText(form.category)}
                    >
                      Copy category
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      )}
    </FormsScreenShell>
  );
}
