"use client";

import { memo, useMemo, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { Textarea } from "@geiger/ui/textarea";
import { cn } from "@/lib/utils";
import { diffDocs } from "./doc-checks";
import { SubtleNote } from "./builder-controls";

function DiffList({ label, tone, items }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Badge variant={tone}>{items.length}</Badge>{label}
      </p>
      <p className="text-xs text-text-secondary">
        {items.slice(0, 6).map((f) => f.title || f).join(", ")}
        {items.length > 6 ? ` and ${items.length - 6} more` : ""}
      </p>
    </div>
  );
}

function RestoreDialog({ version, currentDoc, buildTarget, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const diff = useMemo(() => (version ? diffDocs(currentDoc, buildTarget(version)) : null), [version, currentDoc, buildTarget]);
  const unchanged = diff && !diff.added.length && !diff.removed.length && !diff.changed.length && !diff.settingsChanged.length && !diff.reordered;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(version);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(version)} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore {version?.label}?</DialogTitle>
          <DialogDescription>
            Your current form is saved as a “Before restore” version first, so you can always come back to it.
          </DialogDescription>
        </DialogHeader>
        {diff ? (
          <div className="space-y-3 rounded-lg border border-border bg-background p-3.5">
            {unchanged ? (
              <p className="text-xs text-text-secondary">This version matches the current form.</p>
            ) : (
              <>
                <DiffList label="fields come back" tone="success" items={diff.added} />
                <DiffList label="fields are removed" tone="danger" items={diff.removed} />
                <DiffList label="fields change" tone="warning" items={diff.changed} />
                <DiffList label="settings change" tone="info" items={diff.settingsChanged} />
                {diff.reordered ? <p className="text-xs text-text-secondary">Field order changes.</p> : null}
              </>
            )}
            {version?.notes ? <p className="border-t border-border pt-2 text-xs text-text-tertiary">“{version.notes}”</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Restore version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveDialog({ open, onOpenChange, onSave }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const ok = await onSave(notes.trim());
      if (ok) {
        setNotes("");
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save version</DialogTitle>
          <DialogDescription>Snapshot the form&apos;s questions, logic and settings. Restore it any time from History.</DialogDescription>
        </DialogHeader>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">Change notes <span className="text-text-tertiary">(optional)</span></span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} autoFocus placeholder="What changed in this version?" className="resize-none bg-surface-card text-sm" />
        </label>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Saved versions with snapshot + restore-with-preview.
export const HistorySection = memo(function HistorySection({ versions, loading, currentDoc, buildTarget, onSave, onRestore }) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [restoring, setRestoring] = useState(null);

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="grid place-items-center py-4"><LogoLoading size={32} /></div>
      ) : versions.length === 0 ? (
        <SubtleNote>No saved versions yet. Save one to snapshot this form.</SubtleNote>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
          {versions.map((v) => (
            <div key={v.id} className={cn("rounded-md border p-3", v.current ? "border-border-strong bg-surface-card" : "border-border bg-background")}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-foreground">{v.label}</span>
                {v.current ? <Badge variant="neutral" className="rounded-full">Latest</Badge> : null}
              </div>
              <p className="mt-0.5 text-[11px] text-text-tertiary">{v.when} · {v.author}</p>
              {v.notes ? <p className="mt-1.5 line-clamp-3 text-[11px] leading-4 text-text-secondary">{v.notes}</p> : null}
              <Button type="button" variant="ghost" size="xs" onClick={() => setRestoring(v)} className="mt-2 h-auto gap-1 px-0 font-normal hover:bg-transparent has-[>svg]:px-0 text-[11px] text-text-tertiary transition-colors hover:text-foreground">
                <RotateCcw className="h-3 w-3" />Preview &amp; restore
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" className="w-full text-xs" onClick={() => setSaveOpen(true)}>
        <History className="h-3.5 w-3.5" />Save version
      </Button>

      <SaveDialog open={saveOpen} onOpenChange={setSaveOpen} onSave={onSave} />
      <RestoreDialog
        version={restoring}
        currentDoc={currentDoc}
        buildTarget={buildTarget}
        onCancel={() => setRestoring(null)}
        onConfirm={async (v) => {
          const ok = await onRestore(v);
          if (ok) setRestoring(null);
        }}
      />
    </div>
  );
});
