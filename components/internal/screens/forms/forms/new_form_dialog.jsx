"use client";

import { useMemo, useState } from "react";
import { FilePlus2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Field } from "@geiger/ui/screen-kit";
import { TEMPLATE_CATEGORIES, TEMPLATES, getTemplate, templateToFormInput } from "@/lib/forms/templates";
import { defaultSettings } from "@/lib/forms/schema";
import { cn } from "@/lib/utils";
import { FIELD_CLS, TextInput } from "./sections/kit";

const BLANK = "blank";

// New form: title, folder and a starting point (blank, built-in template or one of your templates).
export function NewFormDialog({ open, onClose, folders = [], userTemplates = [], defaultFolder = null, onCreate, onCreateFromTemplate }) {
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState(defaultFolder || "none");
  const [start, setStart] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    if (start === BLANK) return { title: "Blank form", description: "Start from scratch in the builder.", fields: 0 };
    if (start.startsWith("user:")) {
      const t = userTemplates.find((x) => `user:${x.id}` === start);
      return t ? { title: t.title, description: t.description || "One of your saved templates.", fields: t.fields } : null;
    }
    const t = getTemplate(start);
    return t ? { title: t.title, description: t.description, fields: t.fields.filter((f) => !["page", "heading", "content"].includes(f.type)).length } : null;
  }, [start, userTemplates]);

  const reset = () => {
    setTitle("");
    setFolder(defaultFolder || "none");
    setStart(BLANK);
  };

  const submit = async () => {
    if (busy) return;
    const name = title.trim() || (start !== BLANK ? preview?.title : "") || "Untitled form";
    const category = folder === "none" ? null : folder;
    setBusy(true);
    try {
      if (start.startsWith("user:")) {
        await onCreateFromTemplate(start.slice(5), { title: name, category });
      } else if (start === BLANK) {
        await onCreate({ title: name, category, schema: { fields: [] }, settings: defaultSettings() });
      } else {
        await onCreate({ ...templateToFormInput(getTemplate(start)), title: name, category });
      }
      reset();
      onClose();
    } catch (err) {
      console.error("[forms.create]", err);
      toast.error(err?.message ? `Couldn't create the form: ${err.message}` : "Couldn't create the form.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New form</DialogTitle>
          <DialogDescription>Start blank or from a template — you&apos;ll land in the builder.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Form name" htmlFor="new-form-name">
            <TextInput id="new-form-name" value={title} onChange={setTitle} placeholder={start !== BLANK && preview ? preview.title : "e.g. Partner application"} autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} />
          </Field>
          <Field label="Folder">
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Start from">
            <Select value={start} onValueChange={setStart}>
              <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={BLANK}>Blank form</SelectItem>
                {userTemplates.length ? (
                  <>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Your templates</SelectLabel>
                      {userTemplates.map((t) => (
                        <SelectItem key={t.id} value={`user:${t.id}`}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </>
                ) : null}
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectGroup key={cat}>
                    <SelectSeparator />
                    <SelectLabel>{cat}</SelectLabel>
                    {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {preview ? (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-card p-3">
              <FilePlus2 className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{preview.title}</p>
                <p className="text-xs text-text-secondary">{preview.description}</p>
                {preview.fields ? <p className="mt-1 text-[11px] text-text-tertiary">{preview.fields} fields</p> : null}
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
