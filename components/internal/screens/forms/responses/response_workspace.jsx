"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  CircleDot,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Inbox,
  Kanban,
  ListFilter,
  MoreHorizontal,
  MousePointerClick,
  Printer,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";
import {
  DataTable,
  EmptyState,
  Field,
  LoadingArea,
  SearchInput,
  SectionCard,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ResponseDetailPanel } from "@/components/forms/response-detail-panel";
import { ConfirmDeleteDialog } from "@/components/forms/response/response-dialogs";
import { useCan } from "@/context/rbac-context";
import { cn } from "@/lib/utils";
import { withPrefix } from "@/lib/workspace/base-path";
import { downloadResponses } from "@/lib/forms/export";
import {
  answerFields,
  answerText,
  canonicalFields,
  facetValues,
  fieldLabel,
  filterResponses,
  isEncrypted,
  outcomeLabel,
  sortResponses,
} from "@/lib/forms/response-utils";
import { ErrorState } from "../screen-shell";
import { KanbanBoard } from "./kanban_board";
import { BulkBar } from "./bulk_bar";
import { SavedViewsBar } from "./saved_views_bar";
import {
  DEFAULT_FILTERS,
  MENU_ITEM,
  OUTLINE_BUTTON,
  PRIORITY_FILTER_OPTIONS,
  RESPONSE_PRIORITY_MAP,
  RESPONSE_STATUSES,
  RESPONSE_STATUS_MAP,
  SORT_OPTIONS,
  STATUS_FILTER_OPTIONS,
  avatarColor,
} from "./constants";

const PRINT_LIMIT = 100;
const SKIP_IN_TABLE = new Set(["file", "signature", "repeater", "matrix", "hidden"]);
const NO_FORMS = {};

// Filter keys only (a `sort` key in initial filters/saved views is handled separately).
function pickFilters(source) {
  return Object.fromEntries(Object.keys(DEFAULT_FILTERS).map((k) => [k, source?.[k] ?? DEFAULT_FILTERS[k]]));
}

function MoreFilters({ filters, facets, onChange }) {
  const count = ["tag", "assignee", "outcome"].filter((k) => filters[k] !== "all").length + (filters.from ? 1 : 0) + (filters.to ? 1 : 0);
  const select = (key, options, placeholder) => (
    <Select value={filters[key]} onValueChange={(v) => onChange({ [key]: v })}>
      <SelectTrigger size="sm" className="text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 gap-1.5 rounded-md border-border bg-surface-card px-3 text-xs font-medium text-foreground hover:bg-surface-subtle">
          <ListFilter className="h-3.5 w-3.5 text-text-secondary" />
          More filters
          {count ? <span className="rounded-full bg-surface-hover px-1.5 text-[10px] tabular-nums text-muted-foreground">{count}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-72 gap-3 border-border bg-surface-subtle p-3">
        <Field label="Tag">{select("tag", facets.tags.map((t) => ({ value: t, label: t })), "Any tag")}</Field>
        <Field label="Assignee">
          {select("assignee", [{ value: "__none", label: "Unassigned" }, ...facets.assignees.map((a) => ({ value: a, label: a }))], "Anyone")}
        </Field>
        <Field label="Outcome">{select("outcome", facets.outcomes.map((o) => ({ value: o, label: o })), "Any outcome")}</Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} className="h-8 text-xs" />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} className="h-8 text-xs" />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExportCard({ count, onExport, onPrint, disabled }) {
  return (
    <SectionCard title="Export & sync" description={`Download the ${count} responses in the current view. Columns follow each form's questions.`}>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: FileText, title: "CSV", body: "Excel & Sheets ready, UTF-8", run: () => onExport("csv") },
          { icon: FileJson, title: "JSON", body: "Raw + labelled answers", run: () => onExport("json") },
          { icon: Printer, title: "Print / PDF", body: `Up to ${PRINT_LIMIT} documents`, run: onPrint },
        ].map(({ icon: Icon, title, body, run }) => (
          <Button
            key={title}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={run}
            className="h-auto justify-start gap-3 whitespace-normal rounded-lg bg-surface-card p-3 text-left font-normal shadow-none hover:border-border-strong hover:bg-surface-hover"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle text-muted-foreground"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{title}</span>
              <span className="block text-xs text-text-secondary">{body}</span>
            </span>
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs text-text-tertiary">For continuous sync, pull from the REST API (<code className="text-text-secondary">/api/v1/forms/:id/responses</code>) with a workspace API key, or add a webhook in the form&apos;s integrations.</p>
    </SectionCard>
  );
}

// Shared inbox body: saved views, toolbar, bulk actions, table/kanban and the detail panel.
export function ResponseWorkspace({
  store,
  formsById = NO_FORMS,
  form = null,
  projectId = null,
  initialLayout = "table",
  initialFilters,
  focus = "all",
  questionColumns = 3,
}) {
  const { responses, loading, error, refresh } = store;
  const [filters, setFilters] = useState(() => pickFilters(initialFilters));
  const [sort, setSort] = useState(initialFilters?.sort || "newest");
  const [layout, setLayout] = useState(initialLayout === "kanban" ? "kanban" : "table");
  const [viewId, setViewId] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteIds, setDeleteIds] = useState(null);
  const canExport = useCan("forms.response.export");
  const canDelete = useCan("forms.response.delete");

  const fieldsByForm = useMemo(() => {
    const map = new Map();
    if (form) map.set(form.id, canonicalFields(form));
    for (const [id, f] of Object.entries(formsById)) if (!map.has(id)) map.set(id, canonicalFields(f));
    return map;
  }, [form, formsById]);

  const filtered = useMemo(
    () => sortResponses(filterResponses(responses, filters, (id) => fieldsByForm.get(id)), sort),
    [responses, filters, sort, fieldsByForm],
  );
  const facets = useMemo(() => facetValues(responses), [responses]);
  const selectedRows = useMemo(() => filtered.filter((r) => selected.has(r.id)), [filtered, selected]);
  const openRow = openId ? responses.find((r) => r.id === openId) : null;
  const pager = usePagination(filtered, { resetKey: `${Object.values(filters).join("|")}|${sort}` });
  const page = pager.pageItems;

  const formOptions = useMemo(() => {
    const names = new Map(Object.values(formsById).map((f) => [f.id, f.name || f.title]));
    for (const r of responses) if (!names.has(r.formId)) names.set(r.formId, r.form);
    return [{ value: "all", label: "All forms" }, ...[...names].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))];
  }, [formsById, responses]);

  const isFiltered = Object.entries(DEFAULT_FILTERS).some(([k, v]) => filters[k] !== v);

  const updateFilters = (patch) => {
    setFilters((cur) => ({ ...cur, ...patch }));
    setViewId(null);
  };
  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setViewId(null);
  };
  const applyView = (view) => {
    setFilters(pickFilters(view.filters));
    setSort(view.filters?.sort || "newest");
    setLayout(view.layout === "kanban" ? "kanban" : "table");
    setViewId(view.id);
  };

  const toggle = (id, on) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const allOnPage = page.length > 0 && page.every((r) => selected.has(r.id));
  const someOnPage = page.some((r) => selected.has(r.id));
  const togglePage = (on) =>
    setSelected((cur) => {
      const next = new Set(cur);
      page.forEach((r) => (on ? next.add(r.id) : next.delete(r.id)));
      return next;
    });

  // --- Mutations -----------------------------------------------------------------

  const patchOne = async (row, changes, message) => {
    try {
      await store.patch(row.id, changes);
      if (message) toast.success(message);
    } catch {
      toast.error("Couldn't save that change.");
    }
  };

  const bulkUpdate = async (changes, message) => {
    const ids = selectedRows.map((r) => r.id);
    if (!ids.length) return;
    setBusy(true);
    store.setResponses((cur) => cur.map((r) => (ids.includes(r.id) ? { ...r, ...changes } : r)));
    try {
      await store.bulkUpdate(ids, changes);
      toast.success(`${message} · ${ids.length} response${ids.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Bulk update failed — reloading the latest data.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const bulkTag = async (change) => {
    if (!selectedRows.length) return;
    setBusy(true);
    try {
      await store.bulkTag(selectedRows, change);
      toast.success(change.add ? `Tagged “${change.add[0]}”` : `Removed “${change.remove[0]}”`);
    } catch {
      toast.error("Couldn't update tags.");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    const ids = deleteIds || [];
    try {
      await store.remove(ids);
      setSelected((cur) => {
        const next = new Set(cur);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (ids.includes(openId)) setOpenId(null);
      toast.success(`Deleted ${ids.length} response${ids.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't delete responses.");
    }
  };

  const exportRows = (rows, format) => {
    if (!rows.length) return toast.error("Nothing to export.");
    const base = form ? `${form.slug || form.name}-responses` : "responses";
    downloadResponses(rows, format, base, { formsById, form });
    toast.success(`Exported ${rows.length} response${rows.length === 1 ? "" : "s"} as ${format.toUpperCase()}`);
  };

  const printRows = (rows) => {
    if (!rows.length) return toast.error("Nothing to print.");
    if (rows.length > PRINT_LIMIT) toast.message(`Printing the first ${PRINT_LIMIT} of ${rows.length} responses.`);
    const ids = rows.slice(0, PRINT_LIMIT).map((r) => r.id).join(",");
    window.open(withPrefix(`/print/responses?ids=${ids}`), "_blank", "noopener");
  };

  const openDuplicate = (id) => {
    if (responses.some((r) => r.id === id)) setOpenId(id);
    else toast.message("That response isn't in this view.");
  };

  // --- Table columns ---------------------------------------------------------------

  const qFields = useMemo(
    () => (form ? answerFields(fieldsByForm.get(form.id) || []).filter((f) => !SKIP_IN_TABLE.has(f.type)).slice(0, questionColumns) : []),
    [form, fieldsByForm, questionColumns],
  );
  const columns = [
      {
        key: "select",
        header: (
          <Checkbox
            checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
            onCheckedChange={(v) => togglePage(v === true)}
            aria-label="Select all on this page"
          />
        ),
        className: "w-10 py-3",
        headClassName: "w-10",
        render: (r) => (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} aria-label={`Select ${r.name}`} />
          </div>
        ),
      },
      {
        key: "respondent",
        header: "Respondent",
        className: "py-3",
        render: (r) => (
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-muted-foreground", avatarColor(r.email || r.id))}>{r.initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
              <p className="truncate text-xs text-text-tertiary">{form ? r.email || "—" : r.form}</p>
            </div>
          </div>
        ),
      },
      ...qFields.map((f) => ({
        key: `q-${f.id}`,
        header: <span className="block max-w-40 truncate" title={fieldLabel(f)}>{fieldLabel(f)}</span>,
        className: "max-w-48 py-3",
        render: (r) => (
          <span className="block max-w-48 truncate text-xs text-muted-foreground">
            {isEncrypted(f, r) ? "••••" : answerText(f, r, fieldsByForm.get(form.id)) || "—"}
          </span>
        ),
      })),
      { key: "status", header: "Status", className: "py-3", render: (r) => <StatusPill status={r.status} map={RESPONSE_STATUS_MAP} /> },
      {
        key: "priority",
        header: "Priority",
        className: "py-3",
        render: (r) => (
          <div className="flex items-center gap-1.5">
            <StatusPill status={r.priority} map={RESPONSE_PRIORITY_MAP} />
            {r.score != null ? <span className="rounded bg-surface-card px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{r.score}</span> : null}
          </div>
        ),
      },
      {
        key: "tags",
        header: "Tags",
        className: "hidden py-3 lg:table-cell",
        headClassName: "hidden lg:table-cell",
        render: (r) => (
          <div className="flex max-w-44 flex-wrap gap-1">
            {(r.tags || []).slice(0, 2).map((t) => <span key={t} className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-text-secondary">{t}</span>)}
            {(r.tags || []).length > 2 ? <span className="text-[10px] text-text-tertiary">+{r.tags.length - 2}</span> : null}
            {outcomeLabel(r.outcome) ? <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">{outcomeLabel(r.outcome)}</span> : null}
          </div>
        ),
      },
      {
        key: "assignee",
        header: "Assignee",
        className: "hidden py-3 xl:table-cell",
        headClassName: "hidden xl:table-cell",
        render: (r) => <span className="block max-w-32 truncate text-xs text-text-secondary">{r.assignee || "—"}</span>,
      },
      {
        key: "submitted",
        header: "Submitted",
        className: "hidden whitespace-nowrap py-3 text-xs text-text-tertiary md:table-cell",
        headClassName: "hidden md:table-cell",
        render: (r) => <span title={new Date(r.submittedAt).toLocaleString()}>{r.received}</span>,
      },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        className: "w-10 py-3",
        render: (r) => (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-text-secondary" aria-label={`Actions for ${r.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-border bg-surface-subtle">
                <DropdownMenuItem className={MENU_ITEM} onClick={() => setOpenId(r.id)}><ExternalLink className="h-4 w-4" /> Open</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className={MENU_ITEM}><CircleDot className="h-4 w-4" /> Set status</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="border-border bg-surface-subtle">
                    {RESPONSE_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} className={MENU_ITEM} onClick={() => patchOne(r, { status: s }, `Marked ${s}`)}>
                        <StatusPill status={s} map={RESPONSE_STATUS_MAP} />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem className={MENU_ITEM} onClick={() => printRows([r])}><Printer className="h-4 w-4" /> Print / PDF</DropdownMenuItem>
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2 text-xs text-red-400 focus:bg-red-500/10" onClick={() => setDeleteIds([r.id])}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
  ];

  const body = () => {
    if (loading && !responses.length) return <LoadingArea panel size={40} label="Loading responses" />;
    if (error) return <ErrorState title="Couldn't load responses" description={error.message} onRetry={refresh} />;
    if (!responses.length) {
      return (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState icon={Inbox} title="No responses yet" description={form ? "Share the form link — submissions will land here." : "Submissions from your forms will land here."} />
        </div>
      );
    }
    if (!filtered.length) {
      return (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={ListFilter}
            title="No matching responses"
            description="Nothing matches these filters. Try widening the search or clearing filters."
            action={<Button variant="outline" className={OUTLINE_BUTTON} onClick={clearFilters}>Clear filters</Button>}
          />
        </div>
      );
    }
    if (layout === "kanban") {
      return (
        <KanbanBoard
          rows={filtered}
          showForm={!form}
          onOpen={(r) => setOpenId(r.id)}
          onMove={(row, status) => patchOne(row, { status }, `Moved to ${status}`)}
        />
      );
    }
    return (
      <div className="space-y-5">
        <DataTable columns={columns} data={page} getRowKey={(r) => r.id} onRowClick={(r) => setOpenId(r.id)} />
        <ListPagination {...pager} itemLabel="responses" />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <SavedViewsBar
        projectId={projectId}
        formId={form?.id || null}
        activeId={viewId}
        current={{ filters, sort, layout }}
        onApply={applyView}
        onReset={() => {
          clearFilters();
          setSort("newest");
        }}
      />

      {focus === "export" && canExport ? (
        <ExportCard count={filtered.length} disabled={!filtered.length} onExport={(fmt) => exportRows(filtered, fmt)} onPrint={() => printRows(filtered)} />
      ) : null}

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          {!form ? <FilterDropdown value={filters.formId} onValueChange={(v) => updateFilters({ formId: v })} options={formOptions} icon={FileText} /> : null}
          <FilterDropdown value={filters.status} onValueChange={(v) => updateFilters({ status: v })} options={STATUS_FILTER_OPTIONS} icon={CircleDot} />
          <FilterDropdown value={filters.priority} onValueChange={(v) => updateFilters({ priority: v })} options={PRIORITY_FILTER_OPTIONS} />
          <MoreFilters filters={filters} facets={facets} onChange={updateFilters} />
          <FilterDropdown value={sort} onValueChange={(v) => { setSort(v); setViewId(null); }} options={SORT_OPTIONS} icon={ArrowUpDown} />
          {isFiltered ? (
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-text-secondary hover:text-foreground" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={filters.search} onChange={(v) => updateFilters({ search: v })} placeholder="Search names, emails, answers…" />
          {canExport && focus !== "export" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", OUTLINE_BUTTON)} disabled={!filtered.length}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-border bg-surface-subtle">
                <DropdownMenuItem className={MENU_ITEM} onClick={() => exportRows(filtered, "csv")}><FileText className="h-4 w-4" /> CSV (Excel-ready)</DropdownMenuItem>
                <DropdownMenuItem className={MENU_ITEM} onClick={() => exportRows(filtered, "json")}><FileJson className="h-4 w-4" /> JSON</DropdownMenuItem>
                <DropdownMenuItem className={MENU_ITEM} onClick={() => printRows(filtered)}><Printer className="h-4 w-4" /> Print / PDF</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <p className="px-2 py-1.5 text-[10px] text-text-tertiary">Exports the {filtered.length} responses in the current view</p>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Tabs value={layout} onValueChange={(v) => { setLayout(v); setViewId(null); }}>
            <TabsList>
              <TabsTrigger value="table"><Table2 />Table</TabsTrigger>
              <TabsTrigger value="kanban"><Kanban />Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Toolbar>

      {selectedRows.length ? (
        <BulkBar
          count={selectedRows.length}
          totalFiltered={filtered.length}
          busy={busy}
          canExport={canExport}
          canDelete={canDelete}
          tagSuggestions={facets.tags}
          assigneeSuggestions={facets.assignees}
          onSelectAll={() => setSelected(new Set(filtered.map((r) => r.id)))}
          onClear={() => setSelected(new Set())}
          onUpdate={bulkUpdate}
          onTag={bulkTag}
          onExport={(fmt) => exportRows(selectedRows, fmt)}
          onPrint={() => printRows(selectedRows)}
          onDelete={() => setDeleteIds(selectedRows.map((r) => r.id))}
        />
      ) : focus === "bulk" && layout === "table" && filtered.length ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-text-secondary">
          <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
          Tick responses to update status, priority, tags or assignee in bulk, export them or print them as PDFs.
        </div>
      ) : null}

      {body()}

      {openRow ? (
        <ResponseDetailPanel
          response={openRow}
          form={form && form.id === openRow.formId ? form : formsById[openRow.formId]}
          onClose={() => setOpenId(null)}
          onPatch={store.patch}
          onReplace={(next) => store.setResponses((cur) => cur.map((r) => (r.id === next.id ? next : r)))}
          onDelete={store.remove}
          onOpenResponse={openDuplicate}
          tagSuggestions={facets.tags}
          assigneeSuggestions={facets.assignees}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(deleteIds)}
        onOpenChange={(o) => !o && setDeleteIds(null)}
        count={deleteIds?.length || 0}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
