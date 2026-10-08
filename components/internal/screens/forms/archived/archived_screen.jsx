"use client";

import { useMemo, useState } from "react";
import { Archive, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { useCan } from "@/context/rbac-context";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { formatCount } from "../forms/constants";
import { ErrorState } from "../screen-shell";

const OUTLINE = "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground";

export function ArchivedScreen() {
  const { forms, loading, error, refresh, remove, changeStatus } = useForms();
  const { openForm } = useWorkspaceUrl();
  const canPublish = useCan("forms.form.publish");
  const canDelete = useCan("forms.form.delete");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const archived = useMemo(() => forms.filter((f) => f.status === "Archived"), [forms]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? archived.filter((f) => `${f.name} ${f.category || ""}`.toLowerCase().includes(q)) : archived;
  }, [archived, search]);
  const pager = usePagination(filtered, { resetKey: search });
  const picked = selected.filter((id) => archived.some((f) => f.id === id));
  const allPicked = filtered.length > 0 && filtered.every((f) => picked.includes(f.id));

  const restore = async (ids) => {
    setBusy(true);
    const results = await Promise.allSettled(ids.map((id) => changeStatus(id, "Draft")));
    setBusy(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    setSelected((cur) => cur.filter((id) => !ids.includes(id)));
    if (failed) toast.error(`${failed} form${failed === 1 ? "" : "s"} couldn't be restored.`);
    else toast.success(ids.length === 1 ? "Form restored to drafts" : `${ids.length} forms restored to drafts`);
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await remove(target.id);
      toast.success("Form deleted");
    } catch (err) {
      console.error("[archived.delete]", err);
      toast.error("Couldn't delete the form.");
    }
  };

  const columns = [
    {
      key: "select",
      header: (
        <Checkbox
          aria-label="Select all"
          checked={allPicked}
          onCheckedChange={(v) => setSelected(v ? [...new Set([...picked, ...filtered.map((f) => f.id)])] : picked.filter((id) => !filtered.some((f) => f.id === id)))}
        />
      ),
      className: "w-10",
      render: (f) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox aria-label={`Select ${f.name}`} checked={picked.includes(f.id)} onCheckedChange={(v) => setSelected((cur) => (v ? [...cur, f.id] : cur.filter((x) => x !== f.id)))} />
        </div>
      ),
    },
    { key: "name", header: "Form", render: (f) => <span className="font-medium text-foreground">{f.name}</span> },
    { key: "category", header: "Folder", render: (f) => <span className="text-sm text-text-secondary">{f.category || "—"}</span> },
    { key: "responses", header: "Responses", align: "right", className: "text-right tabular-nums", render: (f) => formatCount(f.responses) },
    { key: "edited", header: "Archived", render: (f) => <span className="text-sm text-text-secondary">{f.lastEdited}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (f) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canPublish ? (
            <Button size="sm" variant="outline" onClick={() => restore([f.id])} disabled={busy} className={OUTLINE}>
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </Button>
          ) : null}
          {canDelete ? (
            <Button size="icon" variant="ghost" aria-label={`Delete ${f.name}`} onClick={() => setDeleteTarget(f)} className="h-8 w-8 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Archived" description="Forms that are no longer collecting responses. Restore them to drafts or delete them." />

      <Toolbar>
        <div className="flex items-center gap-2">
          {picked.length && canPublish ? (
            <Button variant="outline" onClick={() => restore(picked)} disabled={busy} className={OUTLINE}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restore {picked.length} selected
            </Button>
          ) : (
            <span className="text-sm text-text-secondary">{archived.length} archived</span>
          )}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search archived forms…" className="w-full sm:max-w-xs" />
      </Toolbar>

      {loading ? (
        <LoadingArea panel size={40} label="Loading archive" />
      ) : error ? (
        <ErrorState title="Couldn't load the archive" onRetry={refresh} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(f) => f.id}
            onRowClick={(f) => openForm(f.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Archive}
                  title={archived.length ? "No archived forms match" : "Nothing archived"}
                  description={archived.length ? "Try a different search." : "Forms you archive from All Forms or the editor appear here."}
                  action={archived.length ? <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button> : null}
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="forms" />
        </div>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete form</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? It&apos;s removed from the workspace along with access to its responses.
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

export default ArchivedScreen;
