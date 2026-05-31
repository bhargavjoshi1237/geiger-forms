"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { FormsScreenShell, LoadingState, ErrorState, EmptyState } from "../screen-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForms } from "@/lib/hooks/use-forms";

export function ArchivedScreen() {
  const { forms, loading, error, refresh, remove, changeStatus } = useForms();
  const archived = forms.filter((f) => f.status === "Archived");

  const handleDelete = async (form) => {
    if (!window.confirm(`Permanently delete "${form.name}" and its responses?`)) return;
    await remove(form.id);
  };

  return (
    <FormsScreenShell
      eyebrow="Archive"
      title="Archived"
      description="Review forms that are no longer active. Restore them to drafts or delete them for good."
    >
      {loading ? (
        <LoadingState label="Loading archive…" />
      ) : error ? (
        <ErrorState title="Couldn't load the archive" onRetry={refresh} />
      ) : archived.length === 0 ? (
        <EmptyState
          Icon={Archive}
          title="Nothing archived"
          description="Forms you archive from the builder or workspace will appear here."
        />
      ) : (
        <section className="overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Responses</TableHead>
                <TableHead>Last edited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archived.map((item) => (
                <TableRow key={item.id} className="bg-[#1a1a1a] text-[#d4d4d4]">
                  <TableCell className="font-medium text-[#f5f5f5]">{item.name}</TableCell>
                  <TableCell>{item.category || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.responses}</TableCell>
                  <TableCell>{item.lastEdited}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => changeStatus(item.id, "Draft")}
                        className="flex h-7 items-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#202020] px-2.5 text-xs text-[#a3a3a3] transition-colors hover:border-[#474747] hover:text-white"
                        title="Restore to draft"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#242424] hover:text-[#ef4444]"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </FormsScreenShell>
  );
}
