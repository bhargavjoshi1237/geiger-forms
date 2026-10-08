"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, PencilRuler, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { EditorShell } from "@/components/internal/shared/editor_shell";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { useCan } from "@/context/rbac-context";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { withPrefix } from "@/lib/workspace/base-path";

import { FORM_STATUS_MAP } from "./constants";
import { NAV_GROUPS, SECTIONS } from "./form_sections";
import { DisabledHint, OUTLINE_BTN } from "./sections/kit";

const DETAIL_KEYS = ["title", "description", "category", "tags"];
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function seedDraft(form) {
  return {
    title: form.title || form.name || "",
    description: form.description || "",
    category: form.category ?? null,
    tags: form.tags || [],
    settings: form.settings,
  };
}

function diff(draft, form) {
  const details = DETAIL_KEYS.filter((k) => !same(draft[k], form[k] ?? (k === "description" ? "" : k === "tags" ? [] : null)));
  const settings = Object.keys(draft.settings).filter((k) => !same(draft.settings[k], form.settings?.[k]));
  return { details, settings, dirty: details.length > 0 || settings.length > 0 };
}

// Returns [message, sectionKey] for the first blocking problem in the draft.
function validate(draft) {
  const s = draft.settings;
  if (!draft.title.trim()) return ["Give the form a name.", "details"];
  if (s.access?.mode === "password" && !s.access.passwordHash) return ["Set a password, or choose a different access mode.", "access"];
  if (s.access?.mode === "domain" && !s.access.orgDomain) return ["Enter the organisation domain allowed to respond.", "access"];
  if (s.theme?.accent && !/^#[0-9a-f]{6}$/i.test(s.theme.accent)) return ["The accent colour must be a 6-digit hex value.", "themes"];
  if ((s.webhooks || []).some((w) => !/^https?:\/\/\S+\.\S+/i.test(w.url || ""))) return ["Every webhook needs a valid URL.", "integrations"];
  const codes = (s.payments?.coupons || []).map((c) => String(c.code || "").trim().toLowerCase());
  if (codes.some((c) => !c)) return ["Every coupon needs a code.", "coupons"];
  if (new Set(codes).size !== codes.length) return ["Coupon codes must be unique.", "coupons"];
  if (s.approval?.enabled && !(s.approval.steps || []).length) return ["Add at least one approval step.", "approvals"];
  if (s.thankYouType === "redirect" && !/^https?:\/\//i.test(s.thankYouUrl || "")) return ["Enter the redirect URL (https://…).", "screens"];
  return null;
}

// Per-form editor on the shared EditorShell. Sections edit a working copy; Save persists details via
// updateForm and each changed settings group via the shallow server merge, so groups never clobber each other.
export function FormDetailScreen({ form, categories = [], onBack, onUpdate, onMergeSettings, onChangeStatus, onOpenResponses }) {
  const router = useRouter();
  const { setSection } = useWorkspaceUrl();
  const canEdit = useCan("forms.form.edit");
  const canPublish = useCan("forms.form.publish");

  const [draft, setDraft] = useState(() => seedDraft(form));
  const [baseForm, setBaseForm] = useState(form);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [pending, setPending] = useState(null);

  // Re-seed on a different form, or when the saved form changes underneath a clean draft.
  if (form.id !== baseForm.id || form.updatedAt !== baseForm.updatedAt) {
    const switched = form.id !== baseForm.id;
    const clean = !diff(draft, baseForm).dirty;
    setBaseForm(form);
    if (switched || clean) setDraft(seedDraft(form));
  }

  const changes = useMemo(() => diff(draft, form), [draft, form]);

  const set = (key, value) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, [key]: typeof value === "function" ? value(d.settings[key]) : value } }));
  const setGroup = (key, partial) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, [key]: { ...(d.settings[key] || {}), ...partial } } }));
  const setDetails = (partial) => setDraft((d) => ({ ...d, ...partial }));

  const discard = () => setDraft(seedDraft(form));

  const save = async () => {
    if (!changes.dirty || saving) return;
    const problem = validate(draft);
    if (problem) {
      toast.error(problem[0]);
      setSection(problem[1]);
      return;
    }
    setSaving(true);
    try {
      let next = form;
      if (changes.details.length) {
        next = await onUpdate(form.id, Object.fromEntries(changes.details.map((k) => [k, k === "title" ? draft.title.trim() : draft[k]])));
      }
      if (changes.settings.length) {
        next = await onMergeSettings(form.id, Object.fromEntries(changes.settings.map((k) => [k, draft.settings[k]])));
      }
      setBaseForm(next);
      setDraft(seedDraft(next));
      toast.success("Changes saved");
    } catch (err) {
      console.error("[forms.detail.save]", err);
      toast.error(err?.message ? `Couldn't save: ${err.message}` : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status) => {
    setStatusBusy(true);
    try {
      await onChangeStatus(form.id, status);
      toast.success(status === "Published" ? "Form published" : status === "Archived" ? "Form archived" : "Form moved to drafts");
    } catch (err) {
      console.error("[forms.detail.status]", err);
      toast.error("Couldn't change the status.");
    } finally {
      setStatusBusy(false);
    }
  };

  // Leaving with unsaved edits asks first.
  const guard = (action) => (changes.dirty ? setPending(() => action) : action());
  const openBuilder = () => guard(() => router.push(withPrefix(`/forms/${form.slug}`)));
  const preview = () => window.open(withPrefix(`/form/${form.slug}`), "_blank", "noopener,noreferrer");

  const saveButton = (
    <DisabledHint when={!canEdit} hint="Your role can't edit forms.">
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save} disabled={!canEdit || !changes.dirty || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {changes.dirty ? "Save changes" : "Saved"}
      </Button>
    </DisabledHint>
  );

  return (
    <>
      <EditorShell
        back={{ label: "All forms", onClick: () => guard(onBack) }}
        title={draft.title || "Untitled form"}
        status={form.status}
        statusMap={FORM_STATUS_MAP}
        badges={changes.dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
        meta={`${form.fields} fields · ${form.responses} responses${form.lastEdited ? ` · edited ${form.lastEdited}` : ""}`}
        actions={
          <>
            <Button variant="outline" className={OUTLINE_BTN} onClick={preview}>
              <ExternalLink className="h-4 w-4" /> Preview
            </Button>
            <Button variant="outline" className={OUTLINE_BTN} onClick={openBuilder}>
              <PencilRuler className="h-4 w-4" /> Open builder
            </Button>
            {changes.dirty ? (
              <Button variant="ghost" className="text-muted-foreground hover:bg-surface-active hover:text-foreground" onClick={discard} disabled={saving}>
                <RotateCcw className="h-4 w-4" /> Discard
              </Button>
            ) : null}
            {saveButton}
          </>
        }
        nav={NAV_GROUPS}
        sections={SECTIONS}
        sectionProps={{
          form,
          draft,
          settings: draft.settings,
          set,
          setGroup,
          setDetails,
          categories,
          openBuilder,
          preview,
          navigate: setSection,
          changeStatus,
          statusBusy,
          canEdit,
          canPublish,
          onOpenResponses,
        }}
      />

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>You have edits in this form&apos;s settings that haven&apos;t been saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => {
                const action = pending;
                setPending(null);
                discard();
                action?.();
              }}
            >
              Discard & leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FormDetailScreen;
