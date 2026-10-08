"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  BookmarkPlus,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  GlobeLock,
  Inbox,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  PencilRuler,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@geiger/ui/dropdown-menu";
import { useCan } from "@/context/rbac-context";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { slugify } from "@/lib/forms/schema";
import { withPrefix } from "@/lib/workspace/base-path";
import { FormResponsesScreen } from "../responses/form_responses_screen";
import { ErrorState } from "../screen-shell";
import { applyWorkspaceDefaults, folderNames, useWorkspaceSettings } from "../settings/use_workspace_settings";
import { FORM_STATUS_MAP, STATUS_FILTER_OPTIONS, formatCount } from "./constants";
import { FormDetailScreen } from "./form_detail";
import { NewFormDialog } from "./new_form_dialog";

const ITEM = "cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground";

function RowActions({ form, can, onAction }) {
  const published = form.status === "Published";
  const archived = form.status === "Archived";
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${form.name}`} className="h-8 w-8 text-muted-foreground hover:bg-surface-active hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 border-border bg-surface-subtle shadow-xl">
          <DropdownMenuItem className={ITEM} onClick={() => onAction("edit", form)}>
            <Settings2 className="h-4 w-4" /> Edit settings
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onClick={() => onAction("builder", form)}>
            <PencilRuler className="h-4 w-4" /> Open builder
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onClick={() => onAction("responses", form)}>
            <MessageSquare className="h-4 w-4" /> Responses
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onClick={() => onAction("preview", form)}>
            <ExternalLink className="h-4 w-4" /> Preview
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem className={ITEM} onClick={() => onAction("duplicate", form)}>
            <Copy className="h-4 w-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onClick={() => onAction("template", form)}>
            <BookmarkPlus className="h-4 w-4" /> Save as template
          </DropdownMenuItem>
          {can.publish ? (
            <>
              <DropdownMenuItem className={ITEM} onClick={() => onAction(published ? "unpublish" : "publish", form)}>
                {published ? <GlobeLock className="h-4 w-4" /> : <Globe className="h-4 w-4" />} {published ? "Unpublish" : "Publish"}
              </DropdownMenuItem>
              <DropdownMenuItem className={ITEM} onClick={() => onAction(archived ? "restore" : "archive", form)}>
                {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />} {archived ? "Restore to draft" : "Archive"}
              </DropdownMenuItem>
            </>
          ) : null}
          {can.delete ? (
            <>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={() => onAction("delete", form)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FormsScreen() {
  const router = useRouter();
  const url = useWorkspaceUrl();
  const { forms, loading, error, refresh, create, update, mergeSettings, remove, changeStatus, duplicate } = useForms();
  const templates = useForms({ templates: true });
  const workspace = useWorkspaceSettings();
  const can = { publish: useCan("forms.form.publish"), delete: useCan("forms.form.delete") };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [categoryPick, setCategoryPick] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [responsesFormId, setResponsesFormId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const folders = useMemo(() => folderNames(workspace.settings, forms), [workspace.settings, forms]);
  // ?category=<slug> from the Folders screen preselects the folder filter.
  const urlCategory = url.category ? folders.find((c) => slugify(c) === url.category) || null : null;
  const categoryFilter = categoryPick ?? urlCategory ?? "All";

  const stats = useMemo(() => {
    const live = forms.filter((f) => f.status !== "Archived");
    const published = live.filter((f) => f.status === "Published").length;
    return [
      { label: "Forms", value: String(live.length), footer: `${forms.length - live.length} archived` },
      { label: "Published", value: String(published), footer: "Collecting responses" },
      { label: "Drafts", value: String(live.length - published), footer: "Not yet live" },
      { label: "Responses", value: formatCount(forms.reduce((s, f) => s + (f.responses || 0), 0)), footer: "Across all forms" },
    ];
  }, [forms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms.filter((f) => {
      if (statusFilter === "Active" ? f.status === "Archived" : statusFilter !== "All" && f.status !== statusFilter) return false;
      if (categoryFilter !== "All" && (f.category || "") !== (categoryFilter === "__none" ? "" : categoryFilter)) return false;
      if (!q) return true;
      return [f.name, f.category, f.description, ...(f.tags || [])].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [forms, search, statusFilter, categoryFilter]);

  const pager = usePagination(filtered, { resetKey: `${search}|${statusFilter}|${categoryFilter}` });

  const run = async (fn, success, failure) => {
    try {
      const result = await fn();
      if (success) toast.success(success);
      return result;
    } catch (err) {
      console.error("[forms.action]", err);
      toast.error(failure);
      return null;
    }
  };

  const createAndOpen = async (input) => {
    let form = await create({ ...input, settings: applyWorkspaceDefaults(input.settings, workspace.settings) });
    if (workspace.settings.defaultStatus === "Published" && can.publish) form = await changeStatus(form.id, "Published");
    toast.success("Form created");
    router.push(withPrefix(`/forms/${form.slug}`));
  };

  const createFromUserTemplate = async (templateId, { title, category }) => {
    let form = await duplicate(templateId, { title });
    if (category !== form.category) form = await update(form.id, { category });
    toast.success("Form created");
    router.push(withPrefix(`/forms/${form.slug}`));
  };

  const onAction = (action, form) => {
    switch (action) {
      case "edit":
        return url.openForm(form.id);
      case "builder":
        return router.push(withPrefix(`/forms/${form.slug}`));
      case "responses":
        return setResponsesFormId(form.id);
      case "preview":
        return window.open(withPrefix(`/form/${form.slug}`), "_blank", "noopener,noreferrer");
      case "duplicate":
        return run(() => duplicate(form.id), "Form duplicated", "Couldn't duplicate the form.");
      case "template":
        return run(async () => {
          await duplicate(form.id, { asTemplate: true });
          templates.refresh();
        }, "Saved to Your templates", "Couldn't save the template.");
      case "publish":
        return run(() => changeStatus(form.id, "Published"), "Form published", "Couldn't publish the form.");
      case "unpublish":
        return run(() => changeStatus(form.id, "Draft"), "Form unpublished", "Couldn't unpublish the form.");
      case "archive":
        return run(() => changeStatus(form.id, "Archived"), "Form archived", "Couldn't archive the form.");
      case "restore":
        return run(() => changeStatus(form.id, "Draft"), "Form restored to drafts", "Couldn't restore the form.");
      case "delete":
        return setDeleteTarget(form);
      default:
        return null;
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    await run(() => remove(deleteTarget.id), "Form deleted", "Couldn't delete the form.");
    setDeleting(false);
    setDeleteTarget(null);
  };

  // ?form=<id> opens the editor; the section lives in ?section=.
  if (url.form) {
    const open = forms.find((f) => f.id === url.form);
    if (open) {
      return (
        <FormDetailScreen
          form={open}
          categories={folders}
          onBack={() => url.openForm(null)}
          onUpdate={update}
          onMergeSettings={mergeSettings}
          onChangeStatus={changeStatus}
          onOpenResponses={() => {
            setResponsesFormId(open.id);
            url.openForm(null);
          }}
        />
      );
    }
    return (
      <MainScreenWrapper>
        {loading ? (
          <LoadingArea panel size={40} label="Loading form" />
        ) : (
          <div className="rounded-xl border border-border bg-surface-subtle">
            <EmptyState
              icon={FileText}
              title="Form not found"
              description="It may have been deleted, or it belongs to another workspace."
              action={
                <Button variant="outline" onClick={() => url.openForm(null)}>
                  Back to all forms
                </Button>
              }
            />
          </div>
        )}
      </MainScreenWrapper>
    );
  }

  const responsesForm = responsesFormId ? forms.find((f) => f.id === responsesFormId) : null;
  if (responsesForm) return <FormResponsesScreen form={responsesForm} onBack={() => setResponsesFormId(null)} />;

  const columns = [
    {
      key: "name",
      header: "Form",
      render: (f) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-medium text-foreground">{f.name}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
            {f.category ? (
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="h-3 w-3" /> {f.category}
              </span>
            ) : null}
            <span>{f.fields} fields</span>
            {f.tags?.length ? <span>{f.tags.map((t) => `#${t}`).join(" ")}</span> : null}
          </span>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (f) => <StatusPill status={f.status} map={FORM_STATUS_MAP} /> },
    { key: "responses", header: "Responses", align: "right", className: "text-right font-semibold tabular-nums text-foreground", render: (f) => formatCount(f.responses) },
    {
      key: "edited",
      header: "Last edited",
      render: (f) => (
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <Clock3 className="h-3 w-3" /> {f.lastEdited}
        </span>
      ),
    },
    { key: "actions", header: "", align: "right", className: "text-right", render: (f) => <RowActions form={f} can={can} onAction={onAction} /> },
  ];

  const hasFilters = search || statusFilter !== "Active" || categoryFilter !== "All";

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="All Forms"
        description="Every form in this workspace. Open one to edit its settings, or jump into the builder."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> New form
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown value={statusFilter} onValueChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} height="h-9" />
          <FilterDropdown
            value={categoryFilter}
            onValueChange={setCategoryPick}
            options={[{ value: "All", label: "All folders" }, { value: "__none", label: "No folder" }, ...folders.map((c) => ({ value: c, label: c }))]}
            height="h-9"
          />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search forms, tags, folders…" className="w-full sm:max-w-xs" />
      </Toolbar>

      {loading ? (
        <LoadingArea panel size={40} label="Loading forms" />
      ) : error ? (
        <ErrorState title="Couldn't load forms" description="Something went wrong while loading your forms." onRetry={refresh} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(f) => f.id}
            onRowClick={(f) => url.openForm(f.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={forms.length ? Inbox : FileText}
                  title={forms.length ? "No forms match your filters" : "No forms yet"}
                  description={forms.length ? "Clear the search or filters to see everything." : "Create your first form, or start from one of the templates."}
                  action={
                    forms.length && hasFilters ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("Active");
                          setCategoryPick("All");
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setShowNew(true)}>
                        <Plus className="h-4 w-4" /> New form
                      </Button>
                    )
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="forms" />
        </div>
      )}

      <NewFormDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        folders={folders}
        defaultFolder={categoryFilter !== "All" && categoryFilter !== "__none" ? categoryFilter : null}
        userTemplates={templates.forms}
        onCreate={createAndOpen}
        onCreateFromTemplate={createFromUserTemplate}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete form</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? It&apos;s removed from the workspace along with access to its responses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button className="bg-red-500/90 text-white hover:bg-red-500" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default FormsScreen;
