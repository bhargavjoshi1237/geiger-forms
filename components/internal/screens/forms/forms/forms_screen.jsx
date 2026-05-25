"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Edit2,
  ExternalLink,
  FileText,
  Inbox,
  MousePointerClick,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { FormsScreenShell } from "../screen-shell";
import { FormResponsesScreen } from "../responses/form_responses_screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const STARTER_TEMPLATES = [
  { id: "blank", label: "Blank form", description: "Start from scratch" },
  { id: "customer-intake", label: "Customer Intake", description: "Contact + requirements" },
  { id: "event-registration", label: "Event Registration", description: "Name, email, seats" },
  { id: "product-feedback", label: "Product Feedback", description: "NPS + open feedback" },
];

const INITIAL_FORMS = [
  { id: 1, name: "Customer Intake",     status: "Published", responses: 128, lastEdited: "Today",     fields: 8,  rate: "82%", category: "Sales",   tags: ["intake", "b2b", "crm"],          description: "Primary intake form for new sales prospects." },
  { id: 2, name: "Product Feedback",    status: "Draft",     responses: 0,   lastEdited: "Yesterday", fields: 5,  rate: null,  category: "Product", tags: ["nps", "feedback"],               description: "" },
  { id: 3, name: "Event Registration",  status: "Published", responses: 342, lastEdited: "May 18",   fields: 12, rate: "91%", category: "Events",  tags: ["registration", "events"],        description: "Register attendees for company events." },
  { id: 4, name: "Onboarding Survey",   status: "Published", responses: 64,  lastEdited: "May 16",   fields: 6,  rate: "74%", category: "HR",      tags: ["onboarding", "hr", "new-hire"],  description: "Collect new hire info and preferences." },
  { id: 5, name: "Support Request",     status: "Draft",     responses: 0,   lastEdited: "May 14",   fields: 9,  rate: null,  category: "Support", tags: ["support", "triage"],             description: "" },
  { id: 6, name: "Partner Application", status: "Archived",  responses: 18,  lastEdited: "Apr 30",   fields: 15, rate: "65%", category: "Sales",   tags: ["partners", "applications"],      description: "Partner onboarding application form." },
];

const INITIAL_CATEGORIES = ["Sales", "Product", "Operations", "HR", "Events", "Support", "Marketing"];

const statusStyle = {
  Published: "bg-[#0d2218] text-[#4ade80] border-[#166534]",
  Draft:     "bg-[#242424] text-[#737373] border-[#333333]",
  Archived:  "bg-[#1c1917] text-[#78716c] border-[#44403c]",
};

const cardAccents = [
  "from-[#0e1a2e] to-[#1a1a1a]",
  "from-[#1a1a1e] to-[#1a1a1a]",
  "from-[#0d2218] to-[#1a1a1a]",
  "from-[#1e1c0e] to-[#1a1a1a]",
  "from-[#1e0e16] to-[#1a1a1a]",
  "from-[#1a1a1e] to-[#1a1a1a]",
];

// ---------------------------------------------------------------------------
// NewFormDialog
// ---------------------------------------------------------------------------

function NewFormDialog({ onClose }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");

  const handleCreate = () => {
    const slug = slugify(name.trim()) || "untitled-form";
    router.push(`/forms/${slug}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">New form</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] hover:bg-[#242424] hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">Form name <span className="text-[#ef4444]">*</span></label>
            <Input
              className="mt-2"
              placeholder="e.g. Partner Application"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleCreate(); }}
              autoFocus
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[#d4d4d4]">Start from</p>
            <div className="grid grid-cols-2 gap-2">
              {STARTER_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-md border p-3 text-left text-xs transition-colors ${template === t.id ? "border-[#474747] bg-[#242424] text-white" : "border-[#2a2a2a] bg-[#161616] text-[#a3a3a3] hover:border-[#3a3a3a]"}`}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="mt-0.5 text-[10px] text-[#525252]">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#2a2a2a] px-5 py-4">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!name.trim()} onClick={handleCreate} className="gap-1.5 disabled:opacity-40">
            <Plus className="h-4 w-4" />Create form
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditFormMetadataDialog
// ---------------------------------------------------------------------------

function EditFormMetadataDialog({ form, categories, onSave, onClose }) {
  const [name, setName] = useState(form.name);
  const [description, setDescription] = useState(form.description || "");
  const [category, setCategory] = useState(form.category || "");
  const [tags, setTags] = useState(form.tags || []);
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => setTags(tags.filter((x) => x !== t));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Edit form details</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] hover:bg-[#242424] hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">Form name</label>
            <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">
              Description <span className="text-[#525252]">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-2 min-h-16 resize-none text-[#d4d4d4]"
            />
          </div>
          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">Category</label>
            <Select value={category || "none"} onValueChange={(value) => setCategory(value === "none" ? "" : value)}>
              <SelectTrigger className="mt-2 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">Tags</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#202020] px-1.5 py-0.5 text-[10px] text-[#a3a3a3]">
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="text-[#525252] hover:text-white">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag and press Enter..."
                className="h-8 flex-1 text-xs text-[#d4d4d4]"
              />
              <button
                type="button"
                onClick={addTag}
                className="h-8 rounded-md border border-[#2a2a2a] bg-[#202020] px-3 text-xs text-[#a3a3a3] hover:text-white transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#2a2a2a] px-5 py-4">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={() => { onSave({ name, description, category, tags }); onClose(); }}
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ManageCategoriesDialog
// ---------------------------------------------------------------------------

function ManageCategoriesDialog({ categories, onAdd, onDelete, onClose }) {
  const [input, setInput] = useState("");

  const add = () => {
    const c = input.trim();
    if (c && !categories.includes(c)) { onAdd(c); setInput(""); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Manage categories</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] hover:bg-[#242424] hover:text-white transition-colors">
            <X className="h-4 w-4 text-[#737373]" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center justify-between rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-2">
                <span className="text-sm text-[#d4d4d4]">{cat}</span>
                <button
                  type="button"
                  onClick={() => onDelete(cat)}
                  className="text-[#525252] transition-colors hover:text-[#ef4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              placeholder="New category name..."
              className="h-8 flex-1 text-sm text-[#d4d4d4]"
            />
            <button
              type="button"
              onClick={add}
              className="flex h-8 items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#202020] px-3 text-xs text-[#a3a3a3] hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormCard
// ---------------------------------------------------------------------------

function FormCard({ form, accent, onOpen, onEditMeta }) {
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a] transition-colors hover:border-[#3a3a3a] cursor-pointer"
      onClick={onOpen}
    >
      <div className={`flex h-[72px] items-end bg-gradient-to-br ${accent} p-3`}>
        <div className="flex h-7 w-7 items-center justify-center rounded border border-[#2a2a2a] bg-[#161616]/80">
          <FileText className="h-3.5 w-3.5 text-[#a3a3a3]" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-snug text-white">{form.name}</h3>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle[form.status]}`}>
            {form.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373]">
          <span>{form.responses} responses</span>
          <span>·</span>
          <span>{form.fields} fields</span>
          {form.rate && (
            <>
              <span>·</span>
              <span>{form.rate} completion</span>
            </>
          )}
        </div>

        {/* Category badge + tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {form.category && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#202020] px-1.5 py-0.5 text-[10px] text-[#737373]">
              <span
                className="h-1.5 w-1.5 rounded-full"
              />
              {form.category}
            </span>
          )}
          {form.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-[#1e1e1e] px-1.5 py-0.5 text-[10px] text-[#525252]">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[#242424] pt-2.5">
          <span className="flex items-center gap-1 text-[10px] text-[#525252]">
            <Clock3 className="h-3 w-3" />
            {form.lastEdited}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => onEditMeta(e)}
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title="Edit details"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/forms/${slugify(form.name)}`}
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title="Open builder"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/form/${slugify(form.name)}`}
                target="_blank"
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title="Preview filler"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-[#ef4444] transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// FormsScreen
// ---------------------------------------------------------------------------

export function FormsScreen() {
  const [forms, setForms] = useState(INITIAL_FORMS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tagSearch, setTagSearch] = useState("");

  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [showManageCategories, setShowManageCategories] = useState(false);

  if (selectedForm) {
    return <FormResponsesScreen form={selectedForm} onBack={() => setSelectedForm(null)} />;
  }

  const statusCounts = {
    All: forms.length,
    Published: forms.filter((f) => f.status === "Published").length,
    Draft: forms.filter((f) => f.status === "Draft").length,
    Archived: forms.filter((f) => f.status === "Archived").length,
  };

  const filtered = forms.filter((f) => {
    if (activeTab !== "All" && f.status !== activeTab) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "All" && f.category !== categoryFilter) return false;
    if (tagSearch) {
      const q = tagSearch.toLowerCase();
      if (!f.tags.some((t) => t.includes(q)) && !f.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleSaveFormMeta = (updates) => {
    setForms((cur) => cur.map((f) => (f.id === editingForm.id ? { ...f, ...updates } : f)));
  };

  return (
    <>
      <FormsScreenShell
        eyebrow="Workspace"
        title="Forms"
        description="Manage active forms, drafts, and recently edited collection flows from one place."
        stats={[
          { label: "Total forms", value: "12", detail: "3 published", Icon: FileText },
          { label: "Responses", value: "470", detail: "Across all forms", Icon: Inbox },
          { label: "Completion", value: "78%", detail: "Average submission rate", Icon: MousePointerClick },
          { label: "Recent edits", value: "6", detail: "This week", Icon: Clock3 },
        ]}
      >
        <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-fit items-center rounded-md bg-[#0d0d0d] p-0.5 ring-1 ring-white/[0.04]">
                {["All", "Published", "Draft", "Archived"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 h-7 rounded px-3 text-xs font-medium transition-all ${
                      activeTab === tab
                        ? "bg-[#e7e7e7] text-[#111111] shadow-sm"
                        : "text-[#737373] hover:text-[#d4d4d4]"
                    }`}
                  >
                    {tab}
                    <span className={`inline-flex items-center justify-center h-4 min-w-[16px] rounded-full px-1 text-[10px] font-semibold leading-none ${
                      activeTab === tab
                        ? "bg-[#111111]/10 text-[#404040]"
                        : "bg-white/[0.06] text-[#525252]"
                    }`}>
                      {statusCounts[tab]}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-0 flex-1 sm:max-w-64">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter forms..."
                  className="h-8 w-full border-[#2a2a2a] bg-[#0d0d0d] pl-8 pr-8 text-xs text-[#d4d4d4] placeholder:text-[#525252] ring-1 ring-white/[0.04]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#525252] hover:text-[#a3a3a3] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <Button size="sm" className="h-8 shrink-0 gap-1.5 px-3 text-xs" onClick={() => setShowNewForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              New form
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-[#242424] pt-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilter("All")}
                className={`h-7 rounded px-2.5 text-xs font-medium transition-all ${
                  categoryFilter === "All"
                    ? "bg-[#2a2a2a] text-white"
                    : "text-[#737373] hover:bg-white/[0.04] hover:text-[#d4d4d4]"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-1.5 h-7 rounded px-2.5 text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? "bg-[#2a2a2a] text-white"
                      : "text-[#737373] hover:bg-white/[0.04] hover:text-[#d4d4d4]"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                  />
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-40">
                <Tag className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#525252]" />
                <Input
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search tags..."
                  className="h-7 w-full border-[#2a2a2a] bg-[#0d0d0d] pl-7 pr-7 text-xs text-[#d4d4d4] placeholder:text-[#525252] ring-1 ring-white/[0.04]"
                />
                {tagSearch && (
                  <button
                    type="button"
                    onClick={() => setTagSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#525252] hover:text-[#a3a3a3] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowManageCategories(true)}
                className="flex h-7 items-center justify-center gap-1 rounded-md border border-[#2a2a2a] bg-white/[0.02] px-2.5 text-xs font-medium text-[#737373] transition-all hover:border-[#3a3a3a] hover:bg-white/[0.04] hover:text-[#d4d4d4]"
              >
                <Settings className="h-3.5 w-3.5" />
                Categories
              </button>
            </div>
          </div>
        </div>

        {/* Form cards grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((form, i) => (
            <FormCard
              key={form.id}
              form={form}
              accent={cardAccents[i % cardAccents.length]}
              onOpen={() => setSelectedForm(form)}
              onEditMeta={(e) => { e.stopPropagation(); setEditingForm(form); }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-[#333333] bg-[#1a1a1a] text-center p-8">
              <p className="text-sm font-medium text-[#e7e7e7]">No forms match this filter</p>
              <p className="mt-1 text-xs text-[#737373]">Try adjusting your search or switching tabs.</p>
            </div>
          )}
        </div>
      </FormsScreenShell>

      {showNewForm && <NewFormDialog onClose={() => setShowNewForm(false)} />}

      {editingForm && (
        <EditFormMetadataDialog
          form={editingForm}
          categories={categories}
          onSave={handleSaveFormMeta}
          onClose={() => setEditingForm(null)}
        />
      )}

      {showManageCategories && (
        <ManageCategoriesDialog
          categories={categories}
          onAdd={(c) => setCategories((cur) => [...cur, c])}
          onDelete={(c) => setCategories((cur) => cur.filter((x) => x !== c))}
          onClose={() => setShowManageCategories(false)}
        />
      )}
    </>
  );
}
