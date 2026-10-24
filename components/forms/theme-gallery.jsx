"use client";

import { useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@geiger/ui/dropdown-menu";
import { Input } from "@geiger/ui/input";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { Field } from "@geiger/ui/screen-kit";
import { DisabledHint } from "@/components/internal/shared/disabled_hint";
import { useCan } from "@/context/rbac-context";
import { fontStylesheetUrl } from "@/lib/forms/fonts";
import { HEADING_WEIGHTS, backgroundStyle, buildTheme, pickDesign } from "@/lib/forms/theme";
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings";
import { cn } from "@/lib/utils";
import { THEME_PRESETS } from "./theme-preview";

const ITEM = "cursor-pointer gap-2 text-muted-foreground focus:bg-surface-hover focus:text-foreground";

// Clickable miniature of a design: its background, heading font and accent.
function ThemeSwatch({ design, compact, onApply, menu }) {
  const theme = useMemo(() => buildTheme(design), [design]);
  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={onApply}
        aria-label={`Apply the ${design.name} theme`}
        className="block h-auto w-full overflow-hidden rounded-lg bg-surface-card p-0 text-left font-normal shadow-none hover:border-border-strong hover:bg-surface-card"
      >
        <span
          className={cn(theme.className, "flex flex-col justify-between bg-background p-2 text-foreground", compact ? "h-12" : "h-16")}
          style={{ ...theme.style, ...backgroundStyle(theme), backgroundAttachment: "scroll" }}
        >
          <span className={cn("font-(family-name:--gf-font-heading) font-semibold leading-none", compact ? "text-sm" : "text-lg")}>Aa</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-4 rounded-full bg-border-strong" />
          </span>
        </span>
        <span className={cn("block truncate border-t border-border px-2 py-1.5 text-xs text-foreground", menu && "pr-7")}>{design.name}</span>
      </Button>
      {menu ? <div className="absolute bottom-0.5 right-0.5">{menu}</div> : null}
    </div>
  );
}

function NameDialog({ dialog, busy, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [seed, setSeed] = useState(null);
  if (seed !== dialog) {
    setSeed(dialog);
    setName(dialog?.name || "");
  }
  const rename = dialog?.mode === "rename";
  return (
    <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{rename ? "Rename theme" : "Save as workspace theme"}</DialogTitle>
          {rename ? null : <DialogDescription>Saves this form&apos;s colours, fonts, images and logo so any form in the workspace can use them.</DialogDescription>}
        </DialogHeader>
        <Field label="Theme name">
          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && onSubmit(name)} autoFocus placeholder="e.g. Brand — dark" className="h-9 bg-surface-card" />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(name)} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {rename ? "Rename" : "Save theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Built-in presets plus the workspace's saved themes; applying one copies its design into the form (no live link).
export function ThemeGallery({ settings, projectId, onApply, compact = false }) {
  const workspace = useWorkspaceSettings(projectId || null);
  const canManage = useCan("forms.settings.manage");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const saved = useMemo(() => (Array.isArray(workspace.settings.savedThemes) ? workspace.settings.savedThemes : []), [workspace.settings.savedThemes]);
  const fontUrl = useMemo(() => fontStylesheetUrl([...THEME_PRESETS, ...saved].map((d) => [d.theme?.headingFont || d.theme?.font, HEADING_WEIGHTS])), [saved]);

  const apply = (design) => {
    onApply(pickDesign(design));
    toast.success(`Applied “${design.name}”`);
  };

  const persist = async (next, message) => {
    setBusy(true);
    try {
      await workspace.save({ savedThemes: next });
      toast.success(message);
      return true;
    } catch (err) {
      console.error("[themes.save]", err);
      toast.error("Couldn't update the workspace themes.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitName = async (value) => {
    const name = value.trim();
    if (!name) return toast.error("Give the theme a name.");
    if (saved.some((t) => t.id !== dialog.id && t.name.toLowerCase() === name.toLowerCase())) return toast.error("A workspace theme with that name already exists.");
    const next =
      dialog.mode === "rename"
        ? saved.map((t) => (t.id === dialog.id ? { ...t, name } : t))
        : [...saved, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), ...pickDesign(settings) }];
    if (await persist(next, dialog.mode === "rename" ? "Theme renamed" : `Saved “${name}” to workspace themes`)) setDialog(null);
  };

  const menu = (theme) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${theme.name}`} className="text-muted-foreground hover:bg-surface-active hover:text-foreground">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 border-border bg-surface-subtle">
        <DropdownMenuItem className={ITEM} onClick={() => setDialog({ mode: "rename", id: theme.id, name: theme.name })}>
          <Pencil className="h-4 w-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2 text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400"
          onClick={() => persist(saved.filter((t) => t.id !== theme.id), `Deleted “${theme.name}”. Forms that use it keep their design.`)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const grid = cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-5");

  return (
    <div className="space-y-4">
      {fontUrl ? <link rel="stylesheet" href={fontUrl} /> : null}
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-secondary">Presets</p>
        <div className={grid}>
          {THEME_PRESETS.map((preset) => (
            <ThemeSwatch key={preset.id} design={preset} compact={compact} onApply={() => apply(preset)} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-text-secondary">Workspace themes</p>
          <DisabledHint when={!projectId || !canManage} hint={projectId ? "Only workspace admins can save themes." : "Workspace themes are saved to a project."}>
            <Button type="button" variant="ghost" size="xs" disabled={!projectId || !canManage || workspace.loading} onClick={() => setDialog({ mode: "save", name: "" })} className="text-text-secondary">
              <Plus />
              Save current
            </Button>
          </DisabledHint>
        </div>
        {workspace.loading ? (
          <div className="flex justify-center py-4">
            <LogoLoading size={32} />
          </div>
        ) : saved.length ? (
          <div className={grid}>
            {saved.map((theme) => (
              <ThemeSwatch key={theme.id} design={theme} compact={compact} onApply={() => apply(theme)} menu={canManage ? menu(theme) : null} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] leading-4 text-text-tertiary">Save this form&apos;s design to reuse it on any form in the workspace.</p>
        )}
      </div>

      <NameDialog dialog={dialog} busy={busy} onClose={() => setDialog(null)} onSubmit={submitName} />
    </div>
  );
}
