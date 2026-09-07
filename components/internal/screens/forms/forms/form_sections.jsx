"use client";

// Right-hand editor navigation + section registry for the form editor.
//
// Mirrors the events area's event_sections.js: this file owns the per-form topic
// list (NAV_GROUPS) and the key → component map (SECTIONS). Overview and Details
// are wired; the rest are scaffolded placeholders that hand off to the full
// builder route until their in-editor controls land. Add a topic by adding a
// NAV_GROUPS entry and mapping its `key` in SECTIONS.

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  SquarePen,
  MousePointer2,
  Columns3,
  ListChecks,
  GitFork,
  Eye,
  Paintbrush,
  Flag,
  Stamp,
  Languages,
  Files,
  Save,
  Send,
  Wallet,
  ShoppingCart,
  TicketPercent,
  Globe,
  Code,
  Share2,
  Bell,
  Users,
  Plug,
  ExternalLink,
  X,
} from "lucide-react";

import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import {
  StatsBar,
  SectionCard,
  Field,
  StatusPill,
} from "@/components/internal/shared/screen_kit";
import { FORM_STATUS_MAP, formatCount } from "./constants";

// --- Overview ---------------------------------------------------------------

function FormOverviewSection({ form, onOpenBuilder, onPreview, onPublish }) {
  const stats = [
    { label: "Status", value: form.status, footer: form.lastEdited ? `Edited ${form.lastEdited}` : "" },
    { label: "Responses", value: formatCount(form.responses), footer: "Across all versions" },
    { label: "Fields", value: formatCount(form.fields), footer: "Included in the form" },
    {
      label: "Completion",
      value: `${Math.round((Number(form.rate) || 0) * (form.rate <= 1 ? 100 : 1))}%`,
      footer: "Start → submit",
    },
  ];

  return (
    <div className="space-y-6">
      <StatsBar stats={stats} />
      <SectionCard title="At a glance">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Detail label="Form name" value={form.name} />
          <Detail
            label="Status"
            value={<StatusPill status={form.status} map={FORM_STATUS_MAP} />}
          />
          <Detail label="Category" value={form.category || "—"} />
          <Detail
            label="Tags"
            value={form.tags?.length ? form.tags.map((t) => `#${t}`).join("  ") : "—"}
          />
          <Detail label="Public link" value={`/form/${form.slug}`} />
          <Detail label="Description" value={form.description || "—"} />
        </dl>
      </SectionCard>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

// --- Details (inline-editable metadata) -------------------------------------

function FormDetailsSection({ form, categories = [], onPatch }) {
  const [tagInput, setTagInput] = useState("");
  const tags = form.tags || [];

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) onPatch({ tags: [...tags, t] });
    setTagInput("");
  };
  const removeTag = (t) => onPatch({ tags: tags.filter((x) => x !== t) });

  return (
    <SectionCard
      title="Form details"
      description="Name, description, and how this form is organized. Changes are kept when you save."
    >
      <div className="grid gap-4">
        <Field label="Form name" htmlFor="form-name">
          <Input
            id="form-name"
            value={form.name}
            onChange={(e) => onPatch({ name: e.target.value, title: e.target.value })}
            placeholder="e.g. Partner Application"
          />
        </Field>

        <Field label="Description" hint="Optional — shown to your team, not respondents.">
          <Textarea
            value={form.description || ""}
            onChange={(e) => onPatch({ description: e.target.value })}
            rows={2}
            className="min-h-16 resize-none"
            placeholder="What is this form for?"
          />
        </Field>

        <Field label="Category">
          <Select
            value={form.category || "none"}
            onValueChange={(v) => onPatch({ category: v === "none" ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Tags">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-md border border-border bg-surface-card px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-text-tertiary hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter…"
              className="h-9 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              className="h-9 shrink-0 px-3"
            >
              Add
            </Button>
          </div>
        </Field>
      </div>
    </SectionCard>
  );
}

// --- Placeholder section factory --------------------------------------------

// Scaffolds a not-yet-built topic: title + description come from the nav item;
// a card explains where the real controls live and links into the full builder.
function makePlaceholder(Icon, builderNote) {
  function PlaceholderSection({ form, headerItem }) {
    return (
      <SectionCard>
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-card text-text-secondary">
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {headerItem?.label} — coming soon
            </p>
            <p className="mx-auto max-w-md text-sm text-text-secondary">
              {builderNote ||
                "These controls are being moved into the form editor. For now, manage this in the full builder."}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="mt-1 border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
          >
            <Link href={`/forms/${form.slug}`}>
              <ExternalLink className="h-4 w-4" /> Open in builder
            </Link>
          </Button>
        </div>
      </SectionCard>
    );
  }
  return PlaceholderSection;
}

// Per-form topics, grouped the way the workspace sidebar groups the catalog.
// `key` must match a SECTIONS entry; `ownHeader` sections render their own title.
export const NAV_GROUPS = [
  {
    group: null,
    items: [
      {
        key: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        desc: "A snapshot of this form — responses, fields, and quick actions.",
        ownHeader: true,
      },
      {
        key: "details",
        label: "Details",
        icon: SquarePen,
        desc: "Name, description, category, and tags for this form.",
      },
    ],
  },
  {
    group: "Build",
    items: [
      { key: "canvas", label: "Drag & Drop Canvas", icon: MousePointer2, desc: "Arrange fields on the form canvas." },
      { key: "layout", label: "Layout & Columns", icon: Columns3, desc: "Group fields into rows and columns." },
      { key: "fields", label: "Fields", icon: ListChecks, desc: "Add and configure the fields you collect." },
      { key: "logic", label: "Logic & Branching", icon: GitFork, desc: "Show, hide, and branch based on answers." },
      { key: "preview", label: "Preview & Test", icon: Eye, desc: "Try the form the way respondents will." },
    ],
  },
  {
    group: "Design",
    items: [
      { key: "themes", label: "Themes & Colors", icon: Paintbrush, desc: "Match the form to your brand." },
      { key: "screens", label: "Welcome & Ending", icon: Flag, desc: "Frame the form with intro and thank-you screens." },
      { key: "branding", label: "Branding", icon: Stamp, desc: "Logo, white-label, and footer options." },
      { key: "localization", label: "Localization", icon: Languages, desc: "Translate the form for a wider audience." },
    ],
  },
  {
    group: "Flow",
    items: [
      { key: "pages", label: "Multi-step Pages", icon: Files, desc: "Split long forms across pages." },
      { key: "saveresume", label: "Save & Resume", icon: Save, desc: "Let respondents finish later." },
      { key: "submission", label: "Submission Rules", icon: Send, desc: "What happens after submit." },
    ],
  },
  {
    group: "Payments",
    items: [
      { key: "gateways", label: "Gateways", icon: Wallet, desc: "Connect Stripe or PayPal to collect payments." },
      { key: "order", label: "Order Builder", icon: ShoppingCart, desc: "Products, quantities, and totals." },
      { key: "coupons", label: "Coupons", icon: TicketPercent, desc: "Discounts and promotion codes." },
    ],
  },
  {
    group: "Sharing",
    items: [
      { key: "publish", label: "Publish", icon: Globe, desc: "Take the form live and manage its status." },
      { key: "embed", label: "Embed", icon: Code, desc: "Drop the form into your own site." },
      { key: "share", label: "Share Links", icon: Share2, desc: "Public links and social previews." },
    ],
  },
  {
    group: "Settings",
    items: [
      { key: "notifications", label: "Notifications", icon: Bell, desc: "Email alerts on new responses." },
      { key: "access", label: "Access & Sharing", icon: Users, desc: "Who can view and edit this form." },
      { key: "integrations", label: "Integrations", icon: Plug, desc: "Send responses to your other tools." },
    ],
  },
];

// key → section component. Unmapped keys fall back to Overview.
export const SECTIONS = {
  overview: FormOverviewSection,
  details: FormDetailsSection,
  canvas: makePlaceholder(MousePointer2, "Arrange fields on the drag-and-drop canvas in the full builder."),
  layout: makePlaceholder(Columns3),
  fields: makePlaceholder(ListChecks, "Add, reorder, and configure fields in the full builder."),
  logic: makePlaceholder(GitFork),
  preview: makePlaceholder(Eye, "Open the builder to preview and test the live form."),
  themes: makePlaceholder(Paintbrush),
  screens: makePlaceholder(Flag),
  branding: makePlaceholder(Stamp),
  localization: makePlaceholder(Languages),
  pages: makePlaceholder(Files),
  saveresume: makePlaceholder(Save),
  submission: makePlaceholder(Send),
  gateways: makePlaceholder(Wallet),
  order: makePlaceholder(ShoppingCart),
  coupons: makePlaceholder(TicketPercent),
  publish: makePlaceholder(Globe, "Manage publishing and status from the builder's publish dialog."),
  embed: makePlaceholder(Code),
  share: makePlaceholder(Share2),
  notifications: makePlaceholder(Bell),
  access: makePlaceholder(Users),
  integrations: makePlaceholder(Plug),
};
