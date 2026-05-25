"use client";

import {
  Clipboard,
  ClipboardList,
  Copy,
  Contact,
  Eye,
  FileCheck,
  FilePlus2,
  Link2,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormsScreenShell } from "../screen-shell";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

const templates = [
  {
    title: "Lead capture",
    detail: "Qualify prospects and route them to the right sales pipeline.",
    Icon: Contact,
    category: "Sales",
    popular: true,
    uses: 28,
  },
  {
    title: "Feedback survey",
    detail: "Collect NPS scores, open-ended comments, and product signals.",
    Icon: ClipboardList,
    category: "Product",
    uses: 14,
  },
  {
    title: "Approval request",
    detail: "Standardize internal requests with structured review flows.",
    Icon: Sparkles,
    category: "Operations",
    popular: true,
    uses: 11,
  },
  {
    title: "Onboarding form",
    detail: "Collect new hire details, preferences, and access requirements.",
    Icon: UserCheck,
    category: "HR",
    uses: 6,
  },
  {
    title: "Event registration",
    detail: "Capture attendee info, meal preferences, and seat allocation.",
    Icon: FileCheck,
    category: "Events",
    uses: 3,
  },
  {
    title: "Support request",
    detail: "Route customer issues to the right team with structured triage.",
    Icon: Star,
    category: "Support",
    uses: 2,
  },
];

export function TemplatesScreen() {
  const router = useRouter();
  const openTemplate = (title) => router.push(`/forms/${slugify(title)}`);
  const previewTemplate = (title) => router.push(`/form/${slugify(title)}`);
  const duplicateTemplate = (title) => router.push(`/forms/${slugify(title)}-copy`);
  const copyTemplateLink = (title) => {
    if (typeof window === "undefined") return;

    navigator.clipboard?.writeText(`${window.location.origin}/forms/${slugify(title)}`);
  };

  return (
    <FormsScreenShell
      eyebrow="Library"
      title="Templates"
      description="Start from reusable form patterns for common collection workflows."
      action="Create template"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(({ title, detail, Icon, category, popular }) => (
          <ContextMenu key={title}>
            <ContextMenuTrigger asChild>
              <article className="group flex flex-col overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#3a3a3a]">
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#202020]">
                    <Icon className="h-4 w-4 text-[#a3a3a3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-white">{title}</h3>
                      {popular && (
                        <span className="rounded-full border border-[#166534] bg-[#0d2218] px-1.5 py-0 text-[10px] font-medium text-[#4ade80]">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-[#737373]">{detail}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-[#242424] px-4 py-2.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#525252]">{category}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openTemplate(title)}
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
                onSelect={() => openTemplate(title)}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Use template
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                onSelect={() => previewTemplate(title)}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                onSelect={() => duplicateTemplate(title)}
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-[#333333]" />
              <ContextMenuItem
                className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                onSelect={() => navigator.clipboard?.writeText(title)}
              >
                <Clipboard className="w-3.5 h-3.5" />
                Copy name
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                onSelect={() => copyTemplateLink(title)}
              >
                <Link2 className="w-3.5 h-3.5" />
                Copy link
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
                onSelect={() => navigator.clipboard?.writeText(category)}
              >
                Copy category
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </FormsScreenShell>
  );
}
