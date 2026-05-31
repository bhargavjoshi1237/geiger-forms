"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Edit2,
  ExternalLink,
  FileText,
  Globe,
  Inbox,
  Loader2,
  MousePointerClick,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormsScreenShell, LoadingState, ErrorState } from "../screen-shell";
import { SegmentedTabs } from "@/components/internal/shared/segmented_tabs";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { FormResponsesScreen } from "../responses/form_responses_screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForms } from "@/lib/hooks/use-forms";
import { defaultSettings } from "@/lib/forms/schema";
import { PublishDialog } from "@/components/forms/publish-dialog";

const STARTER_TEMPLATES = [
  { id: "blank", label: "Blank form", description: "Start from scratch" },
  { id: "customer-intake", label: "Customer Intake", description: "Contact + requirements" },
  { id: "event-registration", label: "Event Registration", description: "Name, email, seats" },
  { id: "product-feedback", label: "Product Feedback", description: "NPS + open feedback" },
];

const DEFAULT_CATEGORIES = ["Sales", "Product", "Operations", "HR", "Events", "Support", "Marketing"];

const SHARE_ROLES = [
  { value: "viewer", label: "Can view" },
  { value: "editor", label: "Can edit" },
  { value: "admin", label: "Admin" },
];

function shareInitials(email) {
  const handle = (email.split("@")[0] || email).replace(/[^a-z0-9]/gi, "");
  return (handle.slice(0, 2) || "?").toUpperCase();
}

const statusStyle = {
  Published: "bg-[#0d2218] text-[#4ade80] border-[#166534]",
  Draft: "bg-[#242424] text-[#737373] border-[#333333]",
  Archived: "bg-[#1c1917] text-[#78716c] border-[#44403c]",
};

const cardAccents = [
  "from-[#0e1a2e] to-[#1a1a1a]",
  "from-[#1a1a1e] to-[#1a1a1a]",
  "from-[#0d2218] to-[#1a1a1a]",
  "from-[#1e1c0e] to-[#1a1a1a]",
  "from-[#1e0e16] to-[#1a1a1a]",
  "from-[#1a1a1e] to-[#1a1a1a]",
];

function NewFormDialog({ open, onClose, onCreate }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("viewer");
  const [people, setPeople] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedTemplate = STARTER_TEMPLATES.find((t) => t.id === template);

  const addPerson = () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (people.some((p) => p.email === email)) {
      setShareEmail("");
      return;
    }
    setPeople((cur) => [...cur, { email, role: shareRole }]);
    setShareEmail("");
  };

  const removePerson = (email) => setPeople((cur) => cur.filter((p) => p.email !== email));
  const setPersonRole = (email, role) =>
    setPeople((cur) => cur.map((p) => (p.email === email ? { ...p, role } : p)));

  const handleCreate = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = await onCreate({
        title: name.trim(),
        settings: { ...defaultSettings(), template, sharing: people },
      });
      onClose();
      router.push(`/forms/${form.slug}`);
    } catch (err) {
      setError(err.message || "Could not create form.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New form</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">
              Form name <span className="text-[#ef4444]">*</span>
            </label>
            <Input
              className="mt-2 border-[#333333] bg-[#202020] text-white"
              placeholder="e.g. Partner Application"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleCreate();
              }}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[#d4d4d4]">Start from</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="h-9 w-full border-[#333333] bg-[#202020] text-xs text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STARTER_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate?.description ? (
              <p className="mt-1.5 text-[10px] text-[#525252]">{selectedTemplate.description}</p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#737373]" />
              <label className="text-xs font-medium text-[#d4d4d4]">Shared with people</label>
            </div>
            <div className="flex gap-2">
              <Input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPerson();
                  }
                }}
                placeholder="Add people by email…"
                className="h-9 flex-1 border-[#333333] bg-[#202020] text-xs text-white"
              />
              <Select value={shareRole} onValueChange={setShareRole}>
                <SelectTrigger className="h-9 w-[112px] shrink-0 border-[#333333] bg-[#202020] text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHARE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={addPerson}
                disabled={!shareEmail.includes("@")}
                className="h-9 shrink-0 px-3 text-xs disabled:opacity-40"
              >
                Add
              </Button>
            </div>

            <div className="mt-2 space-y-1.5">
              {people.length === 0 ? (
                <p className="text-[10px] text-[#525252]">
                  Only you have access. Add teammates by email to collaborate.
                </p>
              ) : (
                people.map((p) => (
                  <div
                    key={p.email}
                    className="flex items-center justify-between gap-2 rounded-md border border-[#2a2a2a] bg-[#202020] px-2.5 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-[10px] font-semibold text-[#d4d4d4]">
                        {shareInitials(p.email)}
                      </div>
                      <span className="truncate text-xs text-[#d4d4d4]">{p.email}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Select value={p.role} onValueChange={(v) => setPersonRole(p.email, v)}>
                        <SelectTrigger className="h-7 w-[104px] border-[#2a2a2a] bg-[#1a1a1a] text-[11px] text-[#a3a3a3]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHARE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => removePerson(p.email)}
                        className="flex h-6 w-6 items-center justify-center rounded text-[#737373] transition-colors hover:bg-[#242424] hover:text-[#ef4444]"
                        title="Remove access"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-xs text-[#f87171]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" disabled={!name.trim() || submitting} onClick={handleCreate} className="gap-1.5 disabled:opacity-40">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFormMetadataDialog({ form, categories, onSave, onClose }) {
  const [name, setName] = useState(form.name);
  const [description, setDescription] = useState(form.description || "");
  const [category, setCategory] = useState(form.category || "");
  const [tags, setTags] = useState(form.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => setTags(tags.filter((x) => x !== t));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ title: name, description, category: category || null, tags });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit form details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">Form name</label>
            <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
          <div>
            <label className="block text-xs font-medium text-[#d4d4d4]">Category</label>
            <Select value={category || "none"} onValueChange={(value) => setCategory(value === "none" ? "" : value)}>
              <SelectTrigger className="mt-2 h-9">
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
          </div>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
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
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormCard({ form, accent, onOpen, onEditMeta, onDelete, onPublish }) {
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
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {form.category && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#202020] px-1.5 py-0.5 text-[10px] text-[#737373]">
              <Tag className="h-2.5 w-2.5" />
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
                onClick={onPublish}
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title={form.status === "Published" ? "Live — manage publishing" : "Publish"}
              >
                {form.status === "Published" ? (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
                  </span>
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onEditMeta}
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title="Edit details"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/forms/${form.slug}`}
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title="Open builder"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/form/${form.slug}`}
                target="_blank"
                className="flex h-6 w-6 items-center justify-center rounded text-[#737373] hover:bg-[#242424] hover:text-white transition-colors"
                title="Preview filler"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={onDelete}
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

export function FormsScreen() {
  const { forms, loading, error, refresh, create, update, remove, changeStatus } = useForms();

  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [publishingForm, setPublishingForm] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    forms.forEach((f) => f.category && set.add(f.category));
    return [...set];
  }, [forms]);

  const statusCounts = useMemo(
    () => ({
      All: forms.length,
      Published: forms.filter((f) => f.status === "Published").length,
      Draft: forms.filter((f) => f.status === "Draft").length,
      Archived: forms.filter((f) => f.status === "Archived").length,
    }),
    [forms],
  );

  const totalResponses = useMemo(() => forms.reduce((sum, f) => sum + (f.responses || 0), 0), [forms]);

  if (selectedForm) {
    return <FormResponsesScreen form={selectedForm} onBack={() => setSelectedForm(null)} />;
  }

  const filtered = forms.filter((f) => {
    if (activeTab !== "All" && f.status !== activeTab) return false;
    if (categoryFilter !== "All" && f.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        f.name.toLowerCase().includes(q) ||
        (f.category || "").toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  const handleDelete = async (form) => {
    if (!window.confirm(`Delete "${form.name}"? This also removes its responses and cannot be undone.`)) return;
    await remove(form.id);
  };

  return (
    <>
      <FormsScreenShell
        eyebrow="Workspace"
        title="Forms"
        description="Manage active forms, drafts, and recently edited collection flows from one place."
        stats={[
          { label: "Total forms", value: String(statusCounts.All), detail: `${statusCounts.Published} published`, Icon: FileText },
          { label: "Responses", value: String(totalResponses), detail: "Across all forms", Icon: Inbox },
          { label: "Drafts", value: String(statusCounts.Draft), detail: "Not yet published", Icon: MousePointerClick },
          { label: "Archived", value: String(statusCounts.Archived), detail: "Hidden from list", Icon: Clock3 },
        ]}
      >
        <div className="flex flex-col gap-2 rounded-lg bg-[#161616] p-2 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedTabs
            tabs={["All", "Published", "Draft", "Archived"].map((tab) => ({
              label: tab,
              value: tab,
              count: statusCounts[tab],
            }))}
            value={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <div className="relative min-w-0 flex-1 sm:max-w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search forms, tags, categories…"
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

            <FilterDropdown
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              icon={""}
              options={[
                { value: "All", label: "All categories" },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />

            <Button size="sm" className="h-8 shrink-0 gap-1.5 px-3 text-xs" onClick={() => setShowNewForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              New form
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading forms…" />
        ) : error ? (
          <ErrorState
            title="Couldn't load forms"
            description="Something went wrong while loading your forms. Please try again in a moment."
            onRetry={refresh}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((form, i) => (
              <FormCard
                key={form.id}
                form={form}
                accent={cardAccents[i % cardAccents.length]}
                onOpen={() => setSelectedForm(form)}
                onEditMeta={(e) => {
                  e.stopPropagation();
                  setEditingForm(form);
                }}
                onPublish={() => setPublishingForm(form)}
                onDelete={() => handleDelete(form)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-[#333333] bg-[#1a1a1a] text-center p-8">
                <p className="text-sm font-medium text-[#e7e7e7]">
                  {forms.length === 0 ? "No forms yet" : "No forms match this filter"}
                </p>
                <p className="mt-1 text-xs text-[#737373]">
                  {forms.length === 0 ? "Create your first form to get started." : "Try adjusting your search or switching tabs."}
                </p>
              </div>
            )}
          </div>
        )}
      </FormsScreenShell>

      <NewFormDialog open={showNewForm} onClose={() => setShowNewForm(false)} onCreate={create} />

      {editingForm && (
        <EditFormMetadataDialog
          form={editingForm}
          categories={categories}
          onSave={(updates) => update(editingForm.id, updates)}
          onClose={() => setEditingForm(null)}
        />
      )}

      {publishingForm && (() => {
        const live = forms.find((f) => f.id === publishingForm.id) || publishingForm;
        return (
          <PublishDialog
            open
            onOpenChange={(v) => !v && setPublishingForm(null)}
            slug={live.slug}
            status={live.status}
            onChange={(s) => changeStatus(live.id, s)}
          />
        );
      })()}
    </>
  );
}
