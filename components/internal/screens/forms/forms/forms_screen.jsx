"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  ExternalLink,
  FileText,
  Globe,
  Inbox,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { Textarea } from "@geiger/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";

import { useForms } from "@/lib/hooks/use-forms";
import { defaultSettings } from "@/lib/forms/schema";
import { PublishDialog } from "@/components/forms/publish-dialog";
import { FormResponsesScreen } from "../responses/form_responses_screen";
import { FormDetailScreen } from "./form_detail";
import {
  DEFAULT_CATEGORIES,
  FORM_STATUS_MAP,
  STATUS_FILTER_OPTIONS,
  formatCount,
} from "./constants";

const STARTER_TEMPLATES = [
  { id: "blank", label: "Blank form", description: "Start from scratch" },
  { id: "customer-intake", label: "Customer Intake", description: "Contact + requirements" },
  { id: "event-registration", label: "Event Registration", description: "Name, email, seats" },
  { id: "product-feedback", label: "Product Feedback", description: "NPS + open feedback" },
];

const SHARE_ROLES = [
  { value: "viewer", label: "Can view" },
  { value: "editor", label: "Can edit" },
  { value: "admin", label: "Admin" },
];

function shareInitials(email) {
  const handle = (email.split("@")[0] || email).replace(/[^a-z0-9]/gi, "");
  return (handle.slice(0, 2) || "?").toUpperCase();
}

// Percent of a completion rate that may be stored 0–1 or 0–100.
const ratePct = (rate) => {
  const n = Number(rate) || 0;
  return Math.min(100, Math.round(n <= 1 ? n * 100 : n));
};

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
            <label className="block text-xs font-medium text-muted-foreground">
              Form name <span className="text-red-400">*</span>
            </label>
            <Input
              className="mt-2 border-border bg-surface-card text-foreground"
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
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Start from</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="h-9 w-full border-border bg-surface-card text-xs text-foreground">
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
              <p className="mt-1.5 text-[10px] text-text-tertiary">{selectedTemplate.description}</p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-text-secondary" />
              <label className="text-xs font-medium text-muted-foreground">Shared with people</label>
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
                className="h-9 flex-1 border-border bg-surface-card text-xs text-foreground"
              />
              <Select value={shareRole} onValueChange={setShareRole}>
                <SelectTrigger className="h-9 w-[112px] shrink-0 border-border bg-surface-card text-xs text-foreground">
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
                <p className="text-[10px] text-text-tertiary">
                  Only you have access. Add teammates by email to collaborate.
                </p>
              ) : (
                people.map((p) => (
                  <div
                    key={p.email}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-2.5 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-semibold text-muted-foreground">
                        {shareInitials(p.email)}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Select value={p.role} onValueChange={(v) => setPersonRole(p.email, v)}>
                        <SelectTrigger className="h-7 w-[104px] border-border bg-surface-subtle text-[11px] text-muted-foreground">
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
                        className="flex h-6 w-6 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-active hover:text-red-400"
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

          {error && <p className="text-xs text-red-400">{error}</p>}
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
            <label className="block text-xs font-medium text-muted-foreground">Form name</label>
            <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Description <span className="text-text-tertiary">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-2 min-h-16 resize-none text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Category</label>
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
            <label className="block text-xs font-medium text-muted-foreground">Tags</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-md border border-border bg-surface-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="text-text-tertiary hover:text-foreground">
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
                className="h-8 flex-1 text-xs text-muted-foreground"
              />
              <button
                type="button"
                onClick={addTag}
                className="h-8 rounded-md border border-border bg-surface-card px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
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

export function FormsScreen() {
  const router = useRouter();
  const { forms, loading, error, refresh, create, update, remove, changeStatus } = useForms();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [showNewForm, setShowNewForm] = useState(false);
  const [detailForm, setDetailForm] = useState(null);
  const [responsesForm, setResponsesForm] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [publishingForm, setPublishingForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    forms.forEach((f) => f.category && set.add(f.category));
    return [...set];
  }, [forms]);

  const stats = useMemo(() => {
    const published = forms.filter((f) => f.status === "Published").length;
    const drafts = forms.filter((f) => f.status === "Draft").length;
    const responses = forms.reduce((s, f) => s + (f.responses || 0), 0);
    return [
      { label: "Total forms", value: String(forms.length), footer: `${published} published` },
      { label: "Responses", value: responses.toLocaleString(), footer: "Across all forms" },
      { label: "Drafts", value: String(drafts), footer: "Not yet published" },
      { label: "Published", value: String(published), footer: "Live now" },
    ];
  }, [forms]);

  const filtered = useMemo(() => {
    return forms.filter((f) => {
      if (statusFilter !== "All" && f.status !== statusFilter) return false;
      if (categoryFilter !== "All" && f.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          f.name.toLowerCase().includes(q) ||
          (f.category || "").toLowerCase().includes(q) ||
          (f.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [forms, search, statusFilter, categoryFilter]);

  const handleDelete = async (form) => {
    setDeleteTarget(null);
    await remove(form.id);
  };

  const preview = (form) => {
    if (typeof window !== "undefined") {
      window.open(`/form/${form.slug}`, "_blank", "noopener,noreferrer");
    }
  };

  // Detail editor takes over the workspace, mirroring the events area.
  if (detailForm) {
    const live = forms.find((f) => f.id === detailForm.id) || detailForm;
    return (
      <FormDetailScreen
        form={live}
        categories={categories}
        onBack={() => setDetailForm(null)}
        onUpdate={update}
        onPublish={(f) => setPublishingForm(f)}
      />
    );
  }

  if (responsesForm) {
    return <FormResponsesScreen form={responsesForm} onBack={() => setResponsesForm(null)} />;
  }

  const columns = [
    {
      key: "name",
      header: "Form",
      render: (f) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{f.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
            {f.category ? (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3" /> {f.category}
              </span>
            ) : null}
            <span>{f.fields} fields</span>
            {f.lastEdited ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" /> {f.lastEdited}
              </span>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (f) => <StatusPill status={f.status} map={FORM_STATUS_MAP} />,
    },
    {
      key: "responses",
      header: "Responses",
      align: "right",
      className: "text-right font-semibold tabular-nums text-foreground",
      render: (f) => formatCount(f.responses),
    },
    {
      key: "completion",
      header: "Completion",
      render: (f) => {
        const pct = ratePct(f.rate);
        return (
          <div className="w-[150px] space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
              <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-text-secondary">{pct}% start → submit</p>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (f) => (
        <div onClick={(ev) => ev.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-surface-active hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border bg-surface-card shadow-xl">
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground"
                onClick={() => setDetailForm(f)}
              >
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground"
                onClick={() => setEditingForm(f)}
              >
                <SlidersHorizontal className="h-4 w-4" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground"
                onClick={() => setResponsesForm(f)}
              >
                <MessageSquare className="h-4 w-4" /> Responses
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground"
                onClick={() => router.push(`/forms/${f.slug}`)}
              >
                <Globe className="h-4 w-4" /> Open builder
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground"
                onClick={() => preview(f)}
              >
                <ExternalLink className="h-4 w-4" /> Preview filler
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-surface-strong" />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-red-300 focus:bg-red-500/10 focus:text-red-300"
                onClick={() => setDeleteTarget(f)}
              >
                <Trash2 className="h-4 w-4 text-red-300" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="All Forms"
        description="Every form in your workspace — drafts, published, and archived. Search, filter, and manage them all from here."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setShowNewForm(true)}
          >
            <Plus className="h-4 w-4" /> New form
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
            height="h-9"
          />
          <FilterDropdown
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={[
              { value: "All", label: "All categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search forms, tags, categories…"
          className="w-full sm:max-w-xs"
        />
      </Toolbar>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-subtle px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading forms…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FileText}
            title="Couldn't load forms"
            description="Something went wrong while loading your forms. Please try again in a moment."
            action={
              <Button variant="outline" onClick={refresh}>
                Try again
              </Button>
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(f) => f.id}
          onRowClick={(f) => setDetailForm(f)}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={forms.length ? Inbox : FileText}
                title={forms.length ? "No forms match your filters" : "No forms yet"}
                description={
                  forms.length
                    ? "Try clearing the search or filters, or create a new form to get started."
                    : "Create your first form to start collecting responses."
                }
                action={
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setShowNewForm(true)}
                  >
                    <Plus className="h-4 w-4" /> New form
                  </Button>
                }
              />
            </div>
          }
        />
      )}

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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete form</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This also
            removes its responses and can&apos;t be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => handleDelete(deleteTarget)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default FormsScreen;
