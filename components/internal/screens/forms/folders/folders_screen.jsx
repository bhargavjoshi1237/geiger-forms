"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Clock3, FolderInput, FolderOpen, FolderPlus, Inbox, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@geiger/ui/dropdown-menu";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  Field,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { relativeTime } from "@/lib/forms/schema";
import { FORM_STATUS_MAP, formatCount } from "../forms/constants";
import { TextInput } from "../forms/sections/kit";
import { ErrorState } from "../screen-shell";
import { folderNames, useWorkspaceSettings } from "../settings/use_workspace_settings";

const NONE = "__none";
const ITEM = "cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground";

function laterIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

function NameDialog({ open, title, initial = "", confirmLabel, existing, onClose, onSubmit }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState({ open, initial });
  if (seed.open !== open || seed.initial !== initial) {
    setSeed({ open, initial });
    setName(initial);
  }
  const submit = async () => {
    const clean = name.trim();
    if (!clean) return toast.error("Give the folder a name.");
    if (clean !== initial && existing.some((f) => f.toLowerCase() === clean.toLowerCase())) return toast.error("A folder with that name already exists.");
    setBusy(true);
    const ok = await onSubmit(clean);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Field label="Folder name">
          <TextInput value={name} onChange={setName} autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="e.g. Recruiting" />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFormsDialog({ folder, forms, onClose, onAdd }) {
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const candidates = forms.filter((f) => f.category !== folder);
  const submit = async () => {
    setBusy(true);
    await onAdd(picked);
    setBusy(false);
    setPicked([]);
    onClose();
  };
  return (
    <Dialog open={Boolean(folder)} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add forms to {folder}</DialogTitle>
          <DialogDescription>Selected forms move into this folder.</DialogDescription>
        </DialogHeader>
        {candidates.length ? (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {candidates.map((f) => (
              <label key={f.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-hover">
                <Checkbox checked={picked.includes(f.id)} onCheckedChange={(v) => setPicked((cur) => (v ? [...cur, f.id] : cur.filter((x) => x !== f.id)))} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{f.name}</span>
                <span className="shrink-0 text-xs text-text-tertiary">{f.category || "No folder"}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Every form is already in this folder.</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !picked.length} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderInput className="h-4 w-4" />} Move {picked.length || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Folders are form categories; the folder list itself lives in workspace settings.
export function FoldersScreen() {
  const { forms, loading, error, refresh, update } = useForms();
  const workspace = useWorkspaceSettings();
  const { openForm } = useWorkspaceUrl();

  const [openFolder, setOpenFolder] = useState(null);
  const [search, setSearch] = useState("");
  const [formSearch, setFormSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [addTo, setAddTo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const names = useMemo(() => folderNames(workspace.settings, forms), [workspace.settings, forms]);
  const folders = useMemo(() => {
    const stats = new Map([...names, NONE].map((n) => [n, { name: n, forms: 0, published: 0, updatedAt: null }]));
    for (const f of forms) {
      const s = stats.get(f.category || NONE);
      if (!s) continue;
      s.forms += 1;
      if (f.status === "Published") s.published += 1;
      s.updatedAt = laterIso(s.updatedAt, f.updatedAt);
    }
    return [...stats.values()].filter((s) => s.name !== NONE || s.forms > 0);
  }, [names, forms]);

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? folders.filter((f) => (f.name === NONE ? "No folder" : f.name).toLowerCase().includes(q)) : folders;
  }, [folders, search]);
  const folderPager = usePagination(filteredFolders, { resetKey: search });

  const inFolder = useMemo(() => (openFolder ? forms.filter((f) => (f.category || NONE) === openFolder) : []), [forms, openFolder]);
  const filteredForms = useMemo(() => {
    const q = formSearch.trim().toLowerCase();
    if (!q) return inFolder;
    return inFolder.filter((f) => [f.name, f.description, ...(f.tags || [])].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [inFolder, formSearch]);
  const formPager = usePagination(filteredForms, { resetKey: `${openFolder}|${formSearch}` });

  // Opening or leaving a folder starts its form search fresh.
  const showFolder = (name) => {
    setOpenFolder(name);
    setFormSearch("");
  };

  const saved = (workspace.settings.folders || []).map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean);

  const saveFolders = async (next) => {
    try {
      await workspace.save({ folders: next });
      return true;
    } catch (err) {
      console.error("[folders.save]", err);
      toast.error("Couldn't save folders.");
      return false;
    }
  };

  const moveForms = async (ids, category) => {
    const results = await Promise.allSettled(ids.map((id) => update(id, { category })));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) toast.error(`${failed} form${failed === 1 ? "" : "s"} couldn't be moved.`);
    else toast.success(`Moved ${ids.length} form${ids.length === 1 ? "" : "s"}`);
  };

  const createFolder = async (name) => {
    const ok = await saveFolders([...saved, name]);
    if (ok) toast.success("Folder created");
    return ok;
  };

  const renameFolder = async (from, to) => {
    const ok = await saveFolders([...saved.filter((n) => n !== from), to]);
    if (!ok) return false;
    const ids = forms.filter((f) => f.category === from).map((f) => f.id);
    if (ids.length) await moveForms(ids, to);
    else toast.success("Folder renamed");
    if (openFolder === from) setOpenFolder(to);
    return true;
  };

  const deleteFolder = async (name) => {
    setDeleteTarget(null);
    const ok = await saveFolders(saved.filter((n) => n !== name));
    if (!ok) return;
    const ids = forms.filter((f) => f.category === name).map((f) => f.id);
    if (ids.length) await moveForms(ids, null);
    else toast.success("Folder deleted");
    if (openFolder === name) showFolder(null);
  };

  const label = (name) => (name === NONE ? "No folder" : name);

  const folderMenu = (name) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${label(name)}`} onClick={(e) => e.stopPropagation()} className="h-8 w-8 text-muted-foreground hover:bg-surface-active hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 border-border bg-surface-subtle" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem className={ITEM} onClick={() => showFolder(name)}>
          <FolderOpen className="h-4 w-4" /> Open
        </DropdownMenuItem>
        {name !== NONE ? (
          <>
            <DropdownMenuItem className={ITEM} onClick={() => setAddTo(name)}>
              <Plus className="h-4 w-4" /> Add forms
            </DropdownMenuItem>
            <DropdownMenuItem className={ITEM} onClick={() => setDialog({ mode: "rename", name })}>
              <Pencil className="h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={() => setDeleteTarget(name)}>
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const busy = loading || workspace.loading;

  const columns = [
    { key: "name", header: "Form", render: (f) => <span className="font-medium text-foreground">{f.name}</span> },
    { key: "status", header: "Status", render: (f) => <StatusPill status={f.status} map={FORM_STATUS_MAP} /> },
    { key: "responses", header: "Responses", align: "right", className: "text-right tabular-nums", render: (f) => formatCount(f.responses) },
    { key: "edited", header: "Last edited", render: (f) => <span className="text-xs text-text-secondary">{f.lastEdited}</span> },
    {
      key: "move",
      header: "",
      align: "right",
      className: "text-right",
      render: (f) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground">
                <FolderInput className="h-3.5 w-3.5" /> Move
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-52 overflow-y-auto border-border bg-surface-subtle">
              <DropdownMenuLabel className="text-xs text-text-tertiary">Move to</DropdownMenuLabel>
              {[...names, NONE]
                .filter((n) => n !== (f.category || NONE))
                .map((n) => (
                  <DropdownMenuItem key={n} className={ITEM} onClick={() => moveForms([f.id], n === NONE ? null : n)}>
                    <FolderOpen className="h-4 w-4" /> {label(n)}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      {openFolder ? (
        <ScreenHeader
          title={
            <span className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Back to folders" onClick={() => showFolder(null)} className="h-8 w-8 text-muted-foreground hover:bg-surface-active hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {label(openFolder)}
            </span>
          }
          description={`${inFolder.length} form${inFolder.length === 1 ? "" : "s"} in this folder.`}
          actions={
            openFolder !== NONE ? (
              <>
                <Button variant="outline" onClick={() => setDialog({ mode: "rename", name: openFolder })} className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground">
                  <Pencil className="h-4 w-4" /> Rename
                </Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setAddTo(openFolder)}>
                  <Plus className="h-4 w-4" /> Add forms
                </Button>
              </>
            ) : null
          }
        />
      ) : (
        <ScreenHeader
          title="Folders"
          description="Group forms by team, client or workflow. A form lives in one folder at a time."
          actions={
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setDialog({ mode: "create" })}>
              <FolderPlus className="h-4 w-4" /> New folder
            </Button>
          }
        />
      )}

      <Toolbar>
        <span className="text-sm text-text-secondary">
          {openFolder ? `${inFolder.length} form${inFolder.length === 1 ? "" : "s"}` : `${folders.length} folder${folders.length === 1 ? "" : "s"}`}
        </span>
        {openFolder ? (
          <SearchInput value={formSearch} onChange={setFormSearch} placeholder="Search forms in this folder…" className="w-full sm:max-w-xs" />
        ) : (
          <SearchInput value={search} onChange={setSearch} placeholder="Search folders…" className="w-full sm:max-w-xs" />
        )}
      </Toolbar>

      {busy ? (
        <LoadingArea panel size={40} label="Loading folders" />
      ) : error || workspace.error ? (
        <ErrorState
          title="Couldn't load folders"
          onRetry={() => {
            refresh();
            workspace.refresh();
          }}
        />
      ) : openFolder ? (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={formPager.pageItems}
            getRowKey={(f) => f.id}
            onRowClick={(f) => openForm(f.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                {inFolder.length ? (
                  <EmptyState
                    icon={Inbox}
                    title="No forms match your search"
                    description="Try a different search."
                    action={
                      <Button variant="outline" onClick={() => setFormSearch("")}>
                        Clear search
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title="This folder is empty"
                    description="Move existing forms here, or pick this folder when creating a form."
                    action={
                      openFolder !== NONE ? (
                        <Button variant="outline" onClick={() => setAddTo(openFolder)}>
                          <Plus className="h-4 w-4" /> Add forms
                        </Button>
                      ) : null
                    }
                  />
                )}
              </div>
            }
          />
          <ListPagination {...formPager} itemLabel="forms" />
        </div>
      ) : filteredFolders.length ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folderPager.pageItems.map((folder) => (
              <div
                key={folder.name}
                role="button"
                tabIndex={0}
                onClick={() => showFolder(folder.name)}
                onKeyDown={(e) => e.key === "Enter" && showFolder(folder.name)}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-card">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {folderMenu(folder.name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground">{label(folder.name)}</h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    {folder.forms} {folder.forms === 1 ? "form" : "forms"} · {folder.published} published
                  </p>
                </div>
                <div className="flex items-center gap-1 border-t border-border pt-2.5 text-[11px] text-text-tertiary">
                  <Clock3 className="h-3 w-3" />
                  {folder.updatedAt ? `Updated ${relativeTime(folder.updatedAt)}` : "No forms yet"}
                </div>
              </div>
            ))}
          </div>
          <ListPagination {...folderPager} itemLabel="folders" />
        </div>
      ) : folders.length ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FolderOpen}
            title="No folders match your search"
            description="Try a different search."
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FolderOpen}
            title="No folders yet"
            description="Create a folder, then move forms into it to keep the workspace tidy."
            action={
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setDialog({ mode: "create" })}>
                <FolderPlus className="h-4 w-4" /> New folder
              </Button>
            }
          />
        </div>
      )}

      <NameDialog
        open={Boolean(dialog)}
        title={dialog?.mode === "rename" ? "Rename folder" : "New folder"}
        initial={dialog?.mode === "rename" ? dialog.name : ""}
        confirmLabel={dialog?.mode === "rename" ? "Rename" : "Create"}
        existing={names}
        onClose={() => setDialog(null)}
        onSubmit={(name) => (dialog?.mode === "rename" ? renameFolder(dialog.name, name) : createFolder(name))}
      />

      <AddFormsDialog folder={addTo} forms={forms} onClose={() => setAddTo(null)} onAdd={(ids) => moveForms(ids, addTo)} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete folder</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget}</span>? Its forms aren&apos;t deleted — they move to “No folder”.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button className="bg-red-500/90 text-white hover:bg-red-500" onClick={() => deleteFolder(deleteTarget)}>
              <Trash2 className="h-4 w-4" /> Delete folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default FoldersScreen;
