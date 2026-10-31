"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ClipboardCopy,
  Edit3,
  FileDown,
  Loader2,
  PenLine,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@geiger/ui/sheet";
import { Badge } from "@geiger/ui/badge";
import { LoadingArea } from "@geiger/ui/screen-kit";
import { ActionMenu } from "@geiger/ui/action-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { Button } from "@geiger/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Avatar, AvatarFallback } from "@geiger/ui/avatar";
import { cn } from "@/lib/utils";
import { useCan } from "@/context/rbac-context";
import { getFormById } from "@/lib/supabase/forms";
import { assignResponses, updateResponse } from "@/lib/supabase/responses";
import { resolvePerson, useMembers } from "@/lib/hooks/use-members";
import { logAccess } from "@/lib/supabase/audit";
import { callApi } from "@/lib/forms/api";
import { visibleFieldIds } from "@/lib/forms/logic";
import { answerFields, canonicalFields, fieldLabel, outcomeLabel } from "@/lib/forms/response-utils";
import { responseCsv, triggerDownload } from "@/lib/forms/export";
import { withPrefix } from "@/lib/workspace/base-path";
import {
  OUTLINE_BUTTON,
  RESPONSE_PRIORITIES,
  RESPONSE_PRIORITY_MAP,
  RESPONSE_STATUSES,
  RESPONSE_STATUS_MAP,
} from "@/components/internal/screens/forms/responses/constants";
import { AnswerValue } from "./response/answer-value";
import { TagsEditor } from "./response/tags-editor";
import { AssigneePicker, PersonChip, assigneeValue } from "./response/members";
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
    <div className="flex min-h-9 items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-text-secondary">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// Standard suite select for a status-like property; the coloured dot keeps the state scannable.
function PropertySelect({ label, value, options, map, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-44" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", map[option]?.dotClass || "bg-muted-foreground")} />
            {map[option]?.label || option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
      <LoadingArea size={40} label="Loading answers" className="min-h-40 py-0" />
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
          <p key={row.id} className="px-3 pb-1 pt-5 text-sm font-semibold text-foreground first:pt-1">{row.title}</p>
        ) : (
          <div key={row.id} className="rounded-md px-3 py-3 transition-colors hover:bg-surface-card">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{fieldLabel(row.field)}</p>
            <div className="mt-1 text-sm leading-relaxed text-foreground">
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
          <p className="px-3 pb-1 pt-5 text-sm font-semibold text-foreground">{fields.length ? "Other answers" : "Answers"}</p>
          {extras.map(([key, value]) => (
            <div key={key} className="rounded-md px-3 py-3 hover:bg-surface-card">
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{key === "__coupon" ? "Coupon" : key}</p>
              <p className="mt-1 break-words text-sm text-foreground">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
            </div>
          ))}
        </>
      ) : null}
      {!rows.length && !extras.length ? <p className="p-6 text-center text-sm text-text-tertiary">No answers recorded.</p> : null}
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
  onAssign,
  onReplace,
  onDelete,
  onOpenResponse,
  tagSuggestions = [],
}) {
  const [local, setLocal] = useState(null);
  const row = local?.id === response.id && local.updatedAt === response.updatedAt ? local.row : response;
  const { form, loading: formLoading } = useResponseForm(row.formId, formProp);
  const { members, byId, me } = useMembers();
  const [tab, setTab] = useState("answers");
  const [dialog, setDialog] = useState(null);
  const [escalating, setEscalating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const canDelete = useCan("forms.response.delete");
  const canExport = useCan("forms.response.export");
  const canAssign = useCan("forms.form.edit");
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

  const assign = async (member) => {
    setAssigning(true);
    try {
      if (onAssign) await onAssign([row.id], member);
      else replace((await assignResponses([row.id], member?.id ?? null))[0]);
      toast.success(member ? `Assigned to ${member.name}` : "Unassigned");
    } catch (err) {
      toast.error(err.message || "Couldn't change the assignee.");
    } finally {
      setAssigning(false);
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

  const downloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(withPrefix(`/api/responses/${row.id}/pdf`), { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Couldn't generate the PDF.");
      }
      triggerDownload(await res.blob(), `response-${String(row.id).slice(0, 8)}.pdf`, "application/pdf");
    } catch (e) {
      toast.error(e?.message || "Couldn't generate the PDF.");
    } finally {
      setDownloadingPdf(false);
    }
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

  const assignee = resolvePerson(row.assigneeId, row.assignee, byId);
  const flowIssue = row.metadata?.flowIssue;
  const approvalPending = row.approval?.state === "pending" || (form?.settings?.approval?.enabled && !row.approval?.state);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-border bg-surface-subtle p-0 sm:max-w-[560px]"
        // Escape first closes an open autocomplete (the mention list), not the whole panel.
        onEscapeKeyDown={(e) => e.target?.getAttribute?.("aria-expanded") === "true" && e.preventDefault()}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 pr-12">
          <Avatar className="size-10 border border-border">
            <AvatarFallback className="border-0 bg-surface-card text-xs font-semibold text-muted-foreground">{row.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-base leading-tight">{row.name}</SheetTitle>
            <SheetDescription className="mt-0.5 truncate text-sm text-text-secondary">{row.email || "No email"}</SheetDescription>
            <p className="mt-1 truncate text-xs text-text-tertiary">{row.form} · {row.received} · #{String(row.id).slice(0, 8)}</p>
          </div>
        </div>

        <div className="space-y-1 border-b border-border px-5 py-3">
          <PropertyRow label="Status">
            <PropertySelect
              label="Change status"
              value={row.status}
              options={RESPONSE_STATUSES}
              map={RESPONSE_STATUS_MAP}
              onChange={(status) => patch({ status }, `Marked ${status}`)}
            />
          </PropertyRow>
          <PropertyRow label="Priority">
            <div className="flex items-center gap-2">
              <PropertySelect
                label="Override priority"
                value={row.priority}
                options={RESPONSE_PRIORITIES}
                map={RESPONSE_PRIORITY_MAP}
                onChange={(priority) => patch({ priority }, `Priority set to ${priority}`)}
              />
              {row.score != null ? <Badge title="Score" className="tabular-nums">Score {row.score}</Badge> : null}
            </div>
          </PropertyRow>
          <PropertyRow label="Assignee">
            {canAssign ? (
              <AssigneePicker value={assigneeValue(row)} members={members} me={me} onChange={assign}>
                <Button type="button" variant="ghost" size="sm" disabled={assigning} aria-label={`Change assignee, currently ${assignee ? assignee.name : "unassigned"}`} className="max-w-full justify-start px-2 font-normal text-foreground hover:bg-surface-hover">
                  <PersonChip person={assignee} />
                  {assigning ? <Loader2 className="size-3.5 shrink-0 animate-spin text-text-tertiary" /> : null}
                </Button>
              </AssigneePicker>
            ) : (
              <PersonChip person={assignee} className="px-2 text-sm" />
            )}
          </PropertyRow>
          <PropertyRow label="Tags">
            <TagsEditor tags={row.tags} suggestions={tagSuggestions} onChange={(tags) => patch({ tags })} />
          </PropertyRow>
          {outcomeLabel(row.outcome) ? (
            <PropertyRow label="Outcome">
              <Badge variant="purple" className="text-violet-700 dark:text-violet-300">{outcomeLabel(row.outcome)}</Badge>
            </PropertyRow>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <Button type="button" variant="outline" size="sm" className={OUTLINE_BUTTON} onClick={print}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
          {canExport ? (
            <Button type="button" variant="outline" size="sm" className={OUTLINE_BUTTON} onClick={downloadPdf} disabled={downloadingPdf}>
              {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Download PDF
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className={OUTLINE_BUTTON} onClick={() => setDialog("edit")}>
            <Edit3 className="h-4 w-4" /> Request edit
          </Button>
          {flowIssue ? (
            <Badge variant="info" className="h-8 gap-1.5 px-2.5 text-sm text-sky-600 dark:text-sky-400 [&_svg]:size-4">
              <ArrowUpRight /> Flow #{flowIssue.number ?? String(flowIssue.id).slice(0, 6)}
            </Badge>
          ) : (
            <Button type="button" variant="outline" size="sm" className={OUTLINE_BUTTON} onClick={escalate} disabled={escalating}>
              {escalating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              Escalate to Flow
            </Button>
          )}
          <ActionMenu
            label="More actions"
            className="ml-auto"
            items={[
              { icon: PenLine, label: row.metadata?.countersign ? "Countersign again" : "Countersign", onSelect: () => setDialog("countersign") },
              canExport && { icon: ClipboardCopy, label: "Copy as CSV row", onSelect: copyCsv },
              { separator: true },
              canDelete && onDelete && { icon: Trash2, label: "Delete response", destructive: true, onSelect: () => setDialog("delete") },
            ]}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="scrollbar-subtle overflow-x-auto overflow-y-hidden border-b border-border px-2">
            {/* pb-[5px] seats the line indicator on the divider instead of overflowing it */}
            <TabsList variant="line" className="h-11 w-full justify-start pb-[5px]">
              <TabsTrigger value="answers" className="flex-none">Answers</TabsTrigger>
              <TabsTrigger value="activity" className="flex-none">Activity</TabsTrigger>
              <TabsTrigger value="approvals" className="flex-none">
                Approvals
                {approvalPending ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> : null}
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex-none">Payment</TabsTrigger>
              <TabsTrigger value="details" className="flex-none">Details</TabsTrigger>
              <TabsTrigger value="access" className="flex-none">Access</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="answers" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <AnswersTab key={row.id} response={row} form={form} formLoading={formLoading} />
          </TabsContent>
          <TabsContent value="activity" className="flex min-h-0 flex-1 flex-col">
            <ActivitySection response={row} />
          </TabsContent>
          <TabsContent value="approvals" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <ApprovalsSection response={row} form={form} onReplace={replace} />
          </TabsContent>
          <TabsContent value="payment" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <PaymentSection response={row} form={form} />
          </TabsContent>
          <TabsContent value="details" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <MetadataSection response={row} onOpenResponse={onOpenResponse} />
          </TabsContent>
          <TabsContent value="access" className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
