"use client";

import { createElement, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FilePlus2, FileText, LayoutTemplate, Loader2, Lock, PencilRuler, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  Field,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { useCan } from "@/context/rbac-context";
import { useForms } from "@/lib/hooks/use-forms";
import { getFieldIcon } from "@/lib/forms/field-types";
import { fieldTypeLabel } from "@/lib/forms/logic";
import { TEMPLATE_CATEGORIES, TEMPLATES, templateToFormInput } from "@/lib/forms/templates";
import { cn } from "@/lib/utils";
import { withPrefix } from "@/lib/workspace/base-path";
import { ErrorState } from "../screen-shell";
import { FIELD_CLS, OUTLINE_BTN, TextInput } from "../forms/sections/kit";
import { applyWorkspaceDefaults, useWorkspaceSettings } from "../settings/use_workspace_settings";

const LAYOUT = ["page", "heading", "content"];
const TypeIcon = ({ type, className }) => createElement(getFieldIcon(type), { className, "aria-hidden": true });

// What a template switches on, shown as badges.
function highlights(settings, fields) {
  const out = [];
  if (settings.payments?.enabled) out.push(settings.payments.mode === "subscription" ? "Subscription" : "Payments");
  if (settings.approval?.enabled) out.push("Approvals");
  if (settings.quiz?.enabled) out.push("Quiz");
  if (settings.scoringEnabled) out.push("Scoring");
  if (fields.some((f) => f.type === "signature")) out.push("E-signature");
  if (fields.some((f) => f.type === "booking")) out.push("Booking");
  if (fields.some((f) => f.sensitive)) out.push("Sensitive data");
  if (settings.policy?.enabled) out.push("Policy");
  return out;
}

function TemplateCard({ icon, title, description, meta, badges = [], busy, onUse, onPreview, extra }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface-subtle transition-colors hover:border-border-strong">
      <div className="flex flex-1 items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-card text-muted-foreground">
          {createElement(icon || FileText, { className: "h-4 w-4" })}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{description}</p>
          {badges.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges.slice(0, 3).map((b) => (
                <Badge key={b} variant="neutral">
                  {b}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        <span className="truncate text-[11px] text-text-tertiary">{meta}</span>
        <div className="flex shrink-0 items-center gap-1">
          {extra}
          {onPreview ? (
            <Button size="sm" variant="ghost" onClick={onPreview} className="text-muted-foreground hover:bg-surface-active hover:text-foreground">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onUse} disabled={busy} className={OUTLINE_BTN}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Use
          </Button>
        </div>
      </div>
    </article>
  );
}

function PreviewDialog({ template, onClose, onUse, busy }) {
  const fields = template?.fields || [];
  const inputs = fields.filter((f) => !LAYOUT.includes(f.type));
  return (
    <Dialog open={Boolean(template)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template?.title}</DialogTitle>
          <DialogDescription>{template?.description}</DialogDescription>
        </DialogHeader>
        {template ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-1">
              <Badge variant="info">{template.category}</Badge>
              {highlights(template.settings, fields).map((h) => (
                <Badge key={h} variant="neutral">
                  {h}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-text-secondary">{inputs.length} fields</p>
            <ol className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface-card">
              {fields.map((f) => (
                <li key={f.id} className={cn("flex items-center gap-2.5 px-3 py-2", LAYOUT.includes(f.type) && "bg-surface-subtle")}>
                  <TypeIcon type={f.type} className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.type === "page" ? `Page: ${f.title}` : f.label || f.title}</span>
                  {f.sensitive ? <Lock className="h-3 w-3 text-amber-400" aria-label="Sensitive" /> : null}
                  {f.required ? <span className="text-[11px] text-red-400">Required</span> : null}
                  <span className="shrink-0 text-[11px] text-text-tertiary">{fieldTypeLabel(f.type)}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onUse(template)} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Use template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTemplateDialog({ open, onClose, forms, onCreate }) {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("blank");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const from = forms.find((f) => f.id === source);
    const name = title.trim() || from?.title || "";
    if (!name) return toast.error("Give the template a name.");
    setBusy(true);
    const ok = await onCreate({ title: name, sourceId: from?.id || null });
    setBusy(false);
    if (ok) {
      setTitle("");
      setSource("blank");
      onClose();
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create template</DialogTitle>
          <DialogDescription>Save a reusable starting point for your team.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Template name">
            <TextInput value={title} onChange={setTitle} placeholder="e.g. Vendor onboarding" autoFocus />
          </Field>
          <Field label="Start from">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="blank">Blank template</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    Copy of “{f.title}”
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplatesScreen() {
  const router = useRouter();
  const forms = useForms();
  const mine = useForms({ templates: true });
  const canDelete = useCan("forms.form.delete");
  const workspace = useWorkspaceSettings();

  const [tab, setTab] = useState("gallery");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const q = search.trim().toLowerCase();
  const gallery = useMemo(
    () => TEMPLATES.filter((t) => (category === "All" || t.category === category) && (!q || `${t.title} ${t.description} ${t.category}`.toLowerCase().includes(q))),
    [category, q],
  );
  const yours = useMemo(() => mine.forms.filter((t) => !q || `${t.title} ${t.description}`.toLowerCase().includes(q)), [mine.forms, q]);
  const galleryPager = usePagination(gallery, { resetKey: `${search}|${category}` });
  const yoursPager = usePagination(yours, { resetKey: search });

  const openBuilder = (slug) => router.push(withPrefix(`/forms/${slug}`));

  const applyBuiltIn = async (t) => {
    setBusyId(t.id);
    try {
      const input = templateToFormInput(t);
      const form = await forms.create({ ...input, settings: applyWorkspaceDefaults(input.settings, workspace.settings) });
      toast.success(`Created “${form.title}”`);
      openBuilder(form.slug);
    } catch (err) {
      console.error("[templates.use]", err);
      toast.error("Couldn't create a form from this template.");
      setBusyId(null);
    }
  };

  const applyMine = async (t) => {
    setBusyId(t.id);
    try {
      const form = await forms.duplicate(t.id, { title: t.title });
      toast.success(`Created “${form.title}”`);
      openBuilder(form.slug);
    } catch (err) {
      console.error("[templates.applyMine]", err);
      toast.error("Couldn't create a form from this template.");
      setBusyId(null);
    }
  };

  const createTemplate = async ({ title, sourceId }) => {
    try {
      const tpl = sourceId ? await mine.duplicate(sourceId, { title, asTemplate: true }) : await mine.create({ title, isTemplate: true });
      toast.success("Template created");
      setTab("yours");
      if (!sourceId) openBuilder(tpl.slug);
      return true;
    } catch (err) {
      console.error("[templates.create]", err);
      toast.error("Couldn't create the template.");
      return false;
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await mine.remove(target.id);
      toast.success("Template deleted");
    } catch (err) {
      console.error("[templates.delete]", err);
      toast.error("Couldn't delete the template.");
    }
  };

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Templates"
        description="Start from a proven form for any use case, or save your own as reusable starting points."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreating(true)}>
            <FilePlus2 className="h-4 w-4" /> Create template
          </Button>
        }
      />

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="gallery">{`Gallery (${TEMPLATES.length})`}</TabsTrigger>
              <TabsTrigger value="yours">{`Your templates (${mine.forms.length})`}</TabsTrigger>
            </TabsList>
          </Tabs>
          {tab === "gallery" ? (
            <FilterDropdown value={category} onValueChange={setCategory} options={[{ value: "All", label: "All categories" }, ...TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: c }))]} height="h-9" />
          ) : null}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search templates…" className="w-full sm:max-w-xs" />
      </Toolbar>

      {tab === "gallery" ? (
        gallery.length ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {galleryPager.pageItems.map((t) => (
                <TemplateCard
                  key={t.id}
                  icon={t.icon}
                  title={t.title}
                  description={t.description}
                  meta={`${t.category} · ${t.fields.filter((f) => !LAYOUT.includes(f.type)).length} fields`}
                  badges={highlights(t.settings, t.fields)}
                  busy={busyId === t.id}
                  onUse={() => applyBuiltIn(t)}
                  onPreview={() => setPreview(t)}
                />
              ))}
            </div>
            <ListPagination {...galleryPager} itemLabel="templates" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-subtle">
            <EmptyState
              icon={LayoutTemplate}
              title="No templates match"
              description="Try another category or search term."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        )
      ) : mine.loading ? (
        <LoadingArea panel size={40} label="Loading your templates" />
      ) : mine.error ? (
        <ErrorState title="Couldn't load your templates" onRetry={mine.refresh} />
      ) : yours.length ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {yoursPager.pageItems.map((t) => (
              <TemplateCard
                key={t.id}
                title={t.title}
                description={t.description || "Your saved template."}
                meta={`${t.fields} fields · updated ${t.lastEdited}`}
                badges={highlights(t.settings, t.fieldDefs)}
                busy={busyId === t.id}
                onUse={() => applyMine(t)}
                extra={
                  <>
                    <Button size="icon" variant="ghost" aria-label={`Edit ${t.title}`} onClick={() => openBuilder(t.slug)} className="h-8 w-8 text-muted-foreground hover:bg-surface-active hover:text-foreground">
                      <PencilRuler className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete ? (
                      <Button size="icon" variant="ghost" aria-label={`Delete ${t.title}`} onClick={() => setDeleteTarget(t)} className="h-8 w-8 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </>
                }
              />
            ))}
          </div>
          <ListPagination {...yoursPager} itemLabel="templates" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={LayoutTemplate}
            title={mine.forms.length ? "No templates match" : "No saved templates yet"}
            description={mine.forms.length ? "Try another search term." : "Save any form as a template from its row menu, or create one here."}
            action={
              mine.forms.length ? (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreating(true)}>
                  <FilePlus2 className="h-4 w-4" /> Create template
                </Button>
              )
            }
          />
        </div>
      )}

      <PreviewDialog template={preview} onClose={() => setPreview(null)} onUse={applyBuiltIn} busy={Boolean(preview && busyId === preview.id)} />
      <CreateTemplateDialog open={creating} onClose={() => setCreating(false)} forms={forms.forms} onCreate={createTemplate} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete template</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.title}</span>? Forms already created from it are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button className="bg-red-500/90 text-white hover:bg-red-500" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default TemplatesScreen;
