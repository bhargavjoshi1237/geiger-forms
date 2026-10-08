"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ClipboardCopy,
  Edit3,
  Loader2,
  MoreHorizontal,
  PenLine,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@geiger/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@geiger/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { cn } from "@/lib/utils";
import { StatusPill } from "@geiger/ui/screen-kit";
import { useCan } from "@/context/rbac-context";
import { getFormById } from "@/lib/supabase/forms";
import { updateResponse } from "@/lib/supabase/responses";
import { logAccess } from "@/lib/supabase/audit";
import { callApi } from "@/lib/forms/api";
import { visibleFieldIds } from "@/lib/forms/logic";
import { answerFields, canonicalFields, fieldLabel, outcomeLabel } from "@/lib/forms/response-utils";
import { responseCsv } from "@/lib/forms/export";
import { withPrefix } from "@/lib/workspace/base-path";
import {
  MENU_ITEM,
  OUTLINE_BUTTON,
  RESPONSE_PRIORITIES,
  RESPONSE_PRIORITY_MAP,
  RESPONSE_STATUSES,
  RESPONSE_STATUS_MAP,
  avatarColor,
} from "@/components/internal/screens/forms/responses/constants";
import { AnswerValue } from "./response/answer-value";
import { TagsEditor } from "./response/tags-editor";
import { ConfirmDeleteDialog, CountersignDialog, RequestEditDialog } from "./response/response-dialogs";
import {
  AccessLogSection,
  ActivitySection,
  ApprovalsSection,
  CountersignBlock,
  MetadataSection,
  PaymentSection,
} from "./response/response-sections";

const formCache = new Map();

// Loads the response's form (fieldDefs + full settings) unless the caller already has it.
function useResponseForm(formId, provided) {
  const hasProvided = Boolean(provided?.fieldDefs && provided.id === formId);
  const [loaded, setLoaded] = useState(() => (formCache.has(formId) ? { id: formId, form: formCache.get(formId) } : null));

  useEffect(() => {
    if (hasProvided || !formId || formCache.has(formId)) return;
    let live = true;
    getFormById(formId)
      .then((form) => {
        formCache.set(formId, form);
        if (live) setLoaded({ id: formId, form });
      })
      .catch(() => live && setLoaded({ id: formId, form: null }));
    return () => {
      live = false;
    };
  }, [formId, hasProvided]);

  if (hasProvided) return { form: provided, loading: false };
  if (formCache.has(formId)) return { form: formCache.get(formId), loading: false };
  return { form: loaded?.id === formId ? loaded.form : null, loading: loaded?.id !== formId };
}

function PropertyRow({ label, children }) {
  return (
    <div className="flex min-h-8 items-center gap-3">
      <span className="w-20 shrink-0 text-[11px] text-text-tertiary">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// Uncontrolled; remounted per response via `key` so no effect is needed to resync.
function AssigneeInput({ value, suggestions, onCommit }) {
  const [draft, setDraft] = useState(value || "");
  const commit = () => {
    const next = draft.trim();
    if (next !== (value || "")) onCommit(next);
  };
  return (
    <>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(value || "");
        }}
        list="response-assignee-options"
        placeholder="Unassigned — type a name or email"
        className="h-7 border-transparent bg-transparent px-1.5 text-xs shadow-none hover:border-border focus:border-border"
      />
      <datalist id="response-assignee-options">
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  );
}

function AnswersTab({ response, form, formLoading }) {
  const [revealed, setRevealed] = useState({});
  const [revealing, setRevealing] = useState(null);
  const fields = useMemo(() => canonicalFields(form), [form]);
  const visible = useMemo(() => visibleFieldIds(fields, response.answers || {}), [fields, response.answers]);
  const currency = form?.settings?.payments?.currency || "usd";

  const reveal = async (fieldId) => {
    setRevealing(fieldId);
    const { ok, data } = await callApi(`/api/responses/${response.id}/reveal`, { method: "POST", body: { fieldId } });
    setRevealing(null);
    if (!ok) return toast.error(data?.error || "Couldn't reveal this answer.");
    setRevealed((cur) => ({ ...cur, ...(data.answers || {}) }));
  };

  if (formLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <LogoLoading size={40} aria-label="Loading answers" />
      </div>
    );
  }

  const known = new Set(fields.map((f) => f.id));
  const extras = Object.entries(response.answers || {}).filter(([key, v]) => !known.has(key) && v != null && v !== "");
  const rows = [];
  for (const field of fields) {
    if (!visible.has(field.id)) continue;
    if (field.type === "heading" || field.type === "page") {
      const title = field.type === "page" ? field.title : field.label || field.title;
      if (title) rows.push({ kind: "section", id: field.id, title });
      continue;
    }
    if (!answerFields([field], { computed: true }).length) continue;
    rows.push({ kind: "answer", id: field.id, field });
  }

  return (
    <div className="space-y-0.5">
      {rows.map((row) =>
        row.kind === "section" ? (
          <p key={row.id} className="px-3 pb-1 pt-4 text-xs font-semibold text-foreground first:pt-1">{row.title}</p>
        ) : (
          <div key={row.id} className="rounded-md px-3 py-2.5 transition-colors hover:bg-surface-card">
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{fieldLabel(row.field)}</p>
            <div className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              <AnswerValue
                field={row.field}
                response={response}
                fields={fields}
                revealed={revealed}
                revealing={revealing === row.field.id}
                onReveal={reveal}
                currency={currency}
              />
            </div>
          </div>
        ),
      )}
      {extras.length ? (
        <>
          <p className="px-3 pb-1 pt-4 text-xs font-semibold text-foreground">{fields.length ? "Other answers" : "Answers"}</p>
          {extras.map(([key, value]) => (
            <div key={key} className="rounded-md px-3 py-2.5 hover:bg-surface-card">
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{key === "__coupon" ? "Coupon" : key}</p>
              <p className="mt-0.5 break-words text-sm text-muted-foreground">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
            </div>
          ))}
        </>
      ) : null}
      {!rows.length && !extras.length ? <p className="p-4 text-center text-xs text-text-tertiary">No answers recorded.</p> : null}
      {response.metadata?.countersign ? (
        <div className="mx-3 mt-4 border-t border-border pt-4">
          <CountersignBlock response={response} />
        </div>
      ) : null}
    </div>
  );
}

// Side panel for one response: inline triage, tabs for answers/activity/approvals/payment/details/access, and actions.
export function ResponseDetailPanel({
  response,
  form: formProp,
  onClose,
  onPatch,
  onReplace,
  onDelete,
  onOpenResponse,
  tagSuggestions = [],
  assigneeSuggestions = [],
}) {
  const [local, setLocal] = useState(null);
  const row = local?.id === response.id && local.updatedAt === response.updatedAt ? local.row : response;
  const { form, loading: formLoading } = useResponseForm(row.formId, formProp);
  const [tab, setTab] = useState("answers");
  const [dialog, setDialog] = useState(null);
  const [escalating, setEscalating] = useState(false);
  const canDelete = useCan("forms.response.delete");
  const canExport = useCan("forms.response.export");
  const logged = useRef(null);

  // One 'view' access line per opened response.
  useEffect(() => {
    if (logged.current === response.id) return;
    logged.current = response.id;
    logAccess({ formId: response.formId, responseId: response.id, action: "view" });
  }, [response.id, response.formId]);

  const replace = (next) => {
    if (onReplace) onReplace(next);
    else setLocal({ id: response.id, updatedAt: response.updatedAt, row: next });
  };

  const patch = async (changes, message) => {
    try {
      if (onPatch) await onPatch(row.id, changes);
      else replace(await updateResponse(row.id, changes));
      if (message) toast.success(message);
    } catch {
      toast.error("Couldn't save that change.");
    }
  };

  const escalate = async () => {
    setEscalating(true);
    const { ok, data } = await callApi(`/api/responses/${row.id}/escalate`, { method: "POST" });
    setEscalating(false);
    if (!ok) return toast.error(data?.error || "Couldn't escalate to Geiger Flow.");
    replace({ ...row, metadata: { ...row.metadata, flowIssue: data.issue } });
    toast.success(`Created Geiger Flow issue #${data.issue?.number ?? ""}`.trim());
  };

  const print = () => {
    window.open(withPrefix(`/print/response/${row.id}`), "_blank", "noopener");
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(responseCsv(row, form));
      toast.success("Copied as CSV — paste into any sheet");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  const remove = async () => {
    try {
      await onDelete?.([row.id]);
      toast.success("Response deleted");
      onClose();
    } catch {
      toast.error("Couldn't delete the response.");
    }
  };

  const flowIssue = row.metadata?.flowIssue;
  const approvalPending = row.approval?.state === "pending" || (form?.settings?.approval?.enabled && !row.approval?.state);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 border-border bg-surface-subtle p-0 sm:max-w-[560px]">
        <div className="flex items-start gap-3 border-b border-border px-4 py-4 pr-12">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground", avatarColor(row.email || row.id))}>
            {row.initials}
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-sm leading-tight">{row.name}</SheetTitle>
            <SheetDescription className="truncate text-xs text-text-tertiary">{row.email || "No email"}</SheetDescription>
            <p className="mt-0.5 truncate text-[10px] text-text-tertiary">{row.form} · {row.received} · #{String(row.id).slice(0, 8)}</p>
          </div>
        </div>

        <div className="space-y-1 border-b border-border px-4 py-3">
          <PropertyRow label="Status">
            <Select value={row.status} onValueChange={(status) => patch({ status }, `Marked ${status}`)}>
              <SelectTrigger size="sm" className="w-auto gap-1 border-0 bg-transparent px-1 shadow-none focus:ring-0" aria-label="Change status">
                <StatusPill status={row.status} map={RESPONSE_STATUS_MAP} />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </PropertyRow>
          <PropertyRow label="Priority">
            <Select value={row.priority} onValueChange={(priority) => patch({ priority }, `Priority set to ${priority}`)}>
              <SelectTrigger size="sm" className="w-auto gap-1 border-0 bg-transparent px-1 shadow-none focus:ring-0" aria-label="Override priority">
                <StatusPill status={row.priority} map={RESPONSE_PRIORITY_MAP} />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {row.score != null ? <span className="ml-2 rounded bg-surface-card px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground" title="Score">Score {row.score}</span> : null}
          </PropertyRow>
          <PropertyRow label="Assignee">
            <AssigneeInput
              key={`${row.id}:${row.assignee}`}
              value={row.assignee}
              suggestions={assigneeSuggestions}
              onCommit={(assignee) => patch({ assignee }, assignee ? `Assigned to ${assignee}` : "Unassigned")}
            />
          </PropertyRow>
          <PropertyRow label="Tags">
            <TagsEditor tags={row.tags} suggestions={tagSuggestions} onChange={(tags) => patch({ tags })} />
          </PropertyRow>
          {outcomeLabel(row.outcome) ? (
            <PropertyRow label="Outcome">
              <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[11px] text-violet-300">{outcomeLabel(row.outcome)}</span>
            </PropertyRow>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <Button type="button" variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", OUTLINE_BUTTON)} onClick={print}>
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </Button>
          <Button type="button" variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", OUTLINE_BUTTON)} onClick={() => setDialog("edit")}>
            <Edit3 className="h-3.5 w-3.5" /> Request edit
          </Button>
          {flowIssue ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 text-xs text-sky-400">
              <ArrowUpRight className="h-3.5 w-3.5" /> Flow #{flowIssue.number ?? String(flowIssue.id).slice(0, 6)}
            </span>
          ) : (
            <Button type="button" variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", OUTLINE_BUTTON)} onClick={escalate} disabled={escalating}>
              {escalating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              Escalate to Flow
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8 text-text-secondary" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 border-border bg-surface-subtle">
              <DropdownMenuItem className={MENU_ITEM} onClick={() => setDialog("countersign")}>
                <PenLine className="h-4 w-4" /> {row.metadata?.countersign ? "Countersign again" : "Countersign"}
              </DropdownMenuItem>
              {canExport ? (
                <DropdownMenuItem className={MENU_ITEM} onClick={copyCsv}>
                  <ClipboardCopy className="h-4 w-4" /> Copy as CSV row
                </DropdownMenuItem>
              ) : null}
              {canDelete && onDelete ? (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2 text-xs text-red-400 focus:bg-red-500/10" onClick={() => setDialog("delete")}>
                    <Trash2 className="h-4 w-4" /> Delete response
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="scrollbar-subtle overflow-x-auto border-b border-border px-2">
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="answers" className="text-xs">Answers</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
              <TabsTrigger value="approvals" className="text-xs">
                Approvals
                {approvalPending ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="access" className="text-xs">Access</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="answers" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-3">
            <AnswersTab key={row.id} response={row} form={form} formLoading={formLoading} />
          </TabsContent>
          <TabsContent value="activity" className="flex min-h-0 flex-1 flex-col">
            <ActivitySection response={row} />
          </TabsContent>
          <TabsContent value="approvals" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4">
            <ApprovalsSection response={row} form={form} onReplace={replace} />
          </TabsContent>
          <TabsContent value="payment" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4">
            <PaymentSection response={row} form={form} />
          </TabsContent>
          <TabsContent value="details" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4">
            <MetadataSection response={row} onOpenResponse={onOpenResponse} />
          </TabsContent>
          <TabsContent value="access" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4">
            <AccessLogSection key={`${row.id}:${tab}`} response={row} />
          </TabsContent>
        </Tabs>

        <RequestEditDialog open={dialog === "edit"} onOpenChange={(o) => setDialog(o ? "edit" : null)} response={row} />
        <CountersignDialog
          open={dialog === "countersign"}
          onOpenChange={(o) => setDialog(o ? "countersign" : null)}
          response={row}
          onSigned={(countersign) => replace({ ...row, metadata: { ...row.metadata, countersign } })}
        />
        <ConfirmDeleteDialog open={dialog === "delete"} onOpenChange={(o) => setDialog(o ? "delete" : null)} onConfirm={remove} />
      </SheetContent>
    </Sheet>
  );
}

export default ResponseDetailPanel;
